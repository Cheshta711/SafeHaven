from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import socketio
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime
import base64
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Socket.IO setup
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    logger=True,
    engineio_logger=True
)

# Create the main app
app = FastAPI()

# Create Socket.IO ASGI app
socket_app = socketio.ASGIApp(sio, app)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class Location(BaseModel):
    latitude: float
    longitude: float
    address: Optional[str] = None
    type: Optional[str] = None  # 'home', 'work', 'current'

class EmergencyContact(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    phone: str
    relationship: str
    user_id: str

class EmergencyContactCreate(BaseModel):
    name: str
    phone: str
    relationship: str
    user_id: str

class UserProfile(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    age: int
    gender: str
    photo: Optional[str] = None  # base64
    home_location: Optional[Location] = None
    work_location: Optional[Location] = None
    current_location: Optional[Location] = None
    is_helper_mode: bool = False
    socket_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class UserProfileCreate(BaseModel):
    name: str
    age: int
    gender: str
    photo: Optional[str] = None
    home_location: Optional[Location] = None
    work_location: Optional[Location] = None

class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    photo: Optional[str] = None
    home_location: Optional[Location] = None
    work_location: Optional[Location] = None
    current_location: Optional[Location] = None
    is_helper_mode: Optional[bool] = None

class SOSAlert(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    location: Location
    status: str = "active"  # active, resolved, cancelled
    helpers_notified: List[str] = []
    helpers_accepted: List[str] = []
    helpers_declined: List[str] = []
    notification_round: int = 1
    created_at: datetime = Field(default_factory=datetime.utcnow)
    resolved_at: Optional[datetime] = None

class SOSAlertCreate(BaseModel):
    user_id: str
    location: Location

class HelperResponse(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    alert_id: str
    helper_id: str
    response: str  # 'accepted', 'declined'
    helper_location: Optional[Location] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    role: str  # 'user' or 'assistant'
    content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ChatMessageCreate(BaseModel):
    user_id: str
    content: str

class MockNotification(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str  # 'sms', 'police'
    recipient: str
    message: str
    alert_id: str
    status: str = "sent"
    created_at: datetime = Field(default_factory=datetime.utcnow)

# ==================== USER ENDPOINTS ====================

@api_router.get("/")
async def root():
    return {"message": "SafeHaven API - Safety in your pocket"}

@api_router.post("/users", response_model=UserProfile)
async def create_user(user: UserProfileCreate):
    user_dict = user.model_dump()
    user_obj = UserProfile(**user_dict)
    await db.users.insert_one(user_obj.model_dump())
    return user_obj

@api_router.get("/users/{user_id}", response_model=UserProfile)
async def get_user(user_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserProfile(**user)

@api_router.put("/users/{user_id}", response_model=UserProfile)
async def update_user(user_id: str, user_update: UserProfileUpdate):
    update_data = {k: v for k, v in user_update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    user = await db.users.find_one({"id": user_id})
    return UserProfile(**user)

@api_router.get("/users", response_model=List[UserProfile])
async def get_all_users():
    # Optimized: exclude photo field from list queries for performance
    users = await db.users.find({}, {"_id": 0}).to_list(100)
    return [UserProfile(**user) for user in users]

# ==================== EMERGENCY CONTACTS ENDPOINTS ====================

@api_router.post("/contacts", response_model=EmergencyContact)
async def create_contact(contact: EmergencyContactCreate):
    contact_dict = contact.model_dump()
    contact_obj = EmergencyContact(**contact_dict)
    await db.emergency_contacts.insert_one(contact_obj.model_dump())
    return contact_obj

@api_router.get("/contacts/{user_id}", response_model=List[EmergencyContact])
async def get_user_contacts(user_id: str):
    contacts = await db.emergency_contacts.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    return [EmergencyContact(**contact) for contact in contacts]

@api_router.delete("/contacts/{contact_id}")
async def delete_contact(contact_id: str):
    result = await db.emergency_contacts.delete_one({"id": contact_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contact not found")
    return {"message": "Contact deleted successfully"}

# ==================== SOS ALERT ENDPOINTS ====================

@api_router.post("/sos", response_model=SOSAlert)
async def create_sos_alert(alert: SOSAlertCreate):
    alert_dict = alert.model_dump()
    alert_obj = SOSAlert(**alert_dict)
    await db.sos_alerts.insert_one(alert_obj.model_dump())
    
    # Get user info for the alert
    user = await db.users.find_one({"id": alert.user_id})
    
    # Send mock notifications to emergency contacts
    contacts = await db.emergency_contacts.find(
        {"user_id": alert.user_id}, 
        {"name": 1, "phone": 1, "_id": 0}
    ).to_list(100)
    for contact in contacts:
        mock_notification = MockNotification(
            type="sms",
            recipient=contact["phone"],
            message=f"EMERGENCY: {user['name'] if user else 'Your contact'} needs help! Location: {alert.location.latitude}, {alert.location.longitude}",
            alert_id=alert_obj.id
        )
        await db.mock_notifications.insert_one(mock_notification.model_dump())
    
    # Send mock police notification
    police_notification = MockNotification(
        type="police",
        recipient="Nearest Police Station",
        message=f"EMERGENCY ALERT: Person in distress at coordinates {alert.location.latitude}, {alert.location.longitude}",
        alert_id=alert_obj.id
    )
    await db.mock_notifications.insert_one(police_notification.model_dump())
    
    return alert_obj

@api_router.get("/sos/{alert_id}", response_model=SOSAlert)
async def get_sos_alert(alert_id: str):
    alert = await db.sos_alerts.find_one({"id": alert_id})
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return SOSAlert(**alert)

@api_router.get("/sos/user/{user_id}", response_model=List[SOSAlert])
async def get_user_alerts(user_id: str):
    alerts = await db.sos_alerts.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    return [SOSAlert(**alert) for alert in alerts]

@api_router.put("/sos/{alert_id}/resolve")
async def resolve_sos_alert(alert_id: str):
    result = await db.sos_alerts.update_one(
        {"id": alert_id},
        {"$set": {"status": "resolved", "resolved_at": datetime.utcnow()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"message": "Alert resolved successfully"}

@api_router.put("/sos/{alert_id}/cancel")
async def cancel_sos_alert(alert_id: str):
    result = await db.sos_alerts.update_one(
        {"id": alert_id},
        {"$set": {"status": "cancelled", "resolved_at": datetime.utcnow()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"message": "Alert cancelled successfully"}

@api_router.get("/sos/active/all", response_model=List[SOSAlert])
async def get_active_alerts():
    alerts = await db.sos_alerts.find({"status": "active"}).to_list(100)
    return [SOSAlert(**alert) for alert in alerts]

# ==================== HELPER RESPONSE ENDPOINTS ====================

@api_router.post("/helper-response", response_model=HelperResponse)
async def create_helper_response(response: HelperResponse):
    await db.helper_responses.insert_one(response.model_dump())
    
    # Update SOS alert
    if response.response == "accepted":
        await db.sos_alerts.update_one(
            {"id": response.alert_id},
            {"$push": {"helpers_accepted": response.helper_id}}
        )
    else:
        await db.sos_alerts.update_one(
            {"id": response.alert_id},
            {"$push": {"helpers_declined": response.helper_id}}
        )
    
    return response

@api_router.get("/helper-response/{alert_id}", response_model=List[HelperResponse])
async def get_alert_responses(alert_id: str):
    responses = await db.helper_responses.find({"alert_id": alert_id}).to_list(100)
    return [HelperResponse(**r) for r in responses]

# ==================== MOCK NOTIFICATIONS ====================

@api_router.get("/notifications/{alert_id}", response_model=List[MockNotification])
async def get_alert_notifications(alert_id: str):
    notifications = await db.mock_notifications.find({"alert_id": alert_id}).to_list(100)
    return [MockNotification(**n) for n in notifications]

# ==================== AI THERAPY CHAT ENDPOINTS ====================

THERAPY_SYSTEM_MESSAGE = """You are a compassionate, supportive AI therapist specializing in PTSD and emotional support. Your role is to:

1. Provide a safe, non-judgmental space for users to express their feelings
2. Offer grounding techniques and coping strategies
3. Guide users through breathing exercises when needed
4. Validate their experiences and emotions
5. Encourage professional help when appropriate

Important guidelines:
- Be warm, empathetic, and supportive
- Use calming language
- Never dismiss or minimize their feelings
- Offer practical coping strategies when appropriate
- If someone is in immediate danger, encourage them to use the SOS feature or call emergency services
- Remember you are an AI assistant, not a replacement for professional therapy

Start by greeting them warmly and asking how they're feeling today."""

@api_router.post("/chat", response_model=ChatMessage)
async def send_chat_message(message: ChatMessageCreate):
    # Save user message
    user_msg = ChatMessage(
        user_id=message.user_id,
        role="user",
        content=message.content
    )
    await db.chat_messages.insert_one(user_msg.model_dump())
    
    # Get chat history for context
    history = await db.chat_messages.find(
        {"user_id": message.user_id}
    ).sort("created_at", -1).to_list(20)
    
    # Prepare context from history
    context_messages = []
    for msg in reversed(history):
        context_messages.append(f"{msg['role']}: {msg['content']}")
    
    try:
        # Initialize AI chat
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="AI service not configured")
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"therapy_{message.user_id}",
            system_message=THERAPY_SYSTEM_MESSAGE
        )
        chat.with_model("openai", "gpt-4o")
        
        # Create user message with context
        full_context = "\n".join(context_messages[-10:]) if context_messages else ""
        user_message = UserMessage(
            text=f"Previous conversation context:\n{full_context}\n\nUser's current message: {message.content}"
        )
        
        # Get AI response
        response_text = await chat.send_message(user_message)
        
        # Save assistant message
        assistant_msg = ChatMessage(
            user_id=message.user_id,
            role="assistant",
            content=response_text
        )
        await db.chat_messages.insert_one(assistant_msg.model_dump())
        
        return assistant_msg
        
    except Exception as e:
        logger.error(f"AI chat error: {str(e)}")
        # Fallback response
        fallback_msg = ChatMessage(
            user_id=message.user_id,
            role="assistant",
            content="I'm here for you. Sometimes I may have trouble connecting, but please know that your feelings are valid. If you're in crisis, please use the SOS button or reach out to a crisis helpline. How can I support you today?"
        )
        await db.chat_messages.insert_one(fallback_msg.model_dump())
        return fallback_msg

@api_router.get("/chat/{user_id}", response_model=List[ChatMessage])
async def get_chat_history(user_id: str):
    messages = await db.chat_messages.find(
        {"user_id": user_id}
    ).sort("created_at", 1).to_list(100)
    return [ChatMessage(**msg) for msg in messages]

@api_router.delete("/chat/{user_id}")
async def clear_chat_history(user_id: str):
    await db.chat_messages.delete_many({"user_id": user_id})
    return {"message": "Chat history cleared"}

# ==================== GUIDED EXERCISES ====================

GUIDED_EXERCISES = [
    {
        "id": "breathing_478",
        "title": "4-7-8 Breathing",
        "description": "A calming breathing technique to reduce anxiety",
        "duration": "5 minutes",
        "steps": [
            "Find a comfortable position and close your eyes",
            "Breathe in quietly through your nose for 4 seconds",
            "Hold your breath for 7 seconds",
            "Exhale completely through your mouth for 8 seconds",
            "Repeat 4 times"
        ],
        "category": "breathing"
    },
    {
        "id": "grounding_54321",
        "title": "5-4-3-2-1 Grounding",
        "description": "Ground yourself in the present moment",
        "duration": "3-5 minutes",
        "steps": [
            "Name 5 things you can SEE around you",
            "Name 4 things you can TOUCH",
            "Name 3 things you can HEAR",
            "Name 2 things you can SMELL",
            "Name 1 thing you can TASTE"
        ],
        "category": "grounding"
    },
    {
        "id": "body_scan",
        "title": "Body Scan Relaxation",
        "description": "Release tension from your body",
        "duration": "10 minutes",
        "steps": [
            "Lie down or sit comfortably",
            "Close your eyes and take 3 deep breaths",
            "Focus on your feet - notice any tension and let it go",
            "Move up to your legs, then hips, then stomach",
            "Continue to your chest, arms, hands, shoulders, neck, and face",
            "Take 3 more deep breaths and slowly open your eyes"
        ],
        "category": "relaxation"
    },
    {
        "id": "safe_place",
        "title": "Safe Place Visualization",
        "description": "Create a mental sanctuary for calm",
        "duration": "7 minutes",
        "steps": [
            "Close your eyes and take slow, deep breaths",
            "Imagine a place where you feel completely safe and peaceful",
            "Notice the details - colors, sounds, smells, textures",
            "Feel the safety and comfort surrounding you",
            "Stay in this place for a few minutes",
            "When ready, slowly return to the present"
        ],
        "category": "visualization"
    }
]

@api_router.get("/exercises")
async def get_exercises():
    return GUIDED_EXERCISES

@api_router.get("/exercises/{exercise_id}")
async def get_exercise(exercise_id: str):
    for exercise in GUIDED_EXERCISES:
        if exercise["id"] == exercise_id:
            return exercise
    raise HTTPException(status_code=404, detail="Exercise not found")

# ==================== NEARBY HELPERS ====================

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate approximate distance in km using Haversine formula"""
    from math import radians, sin, cos, sqrt, atan2
    
    R = 6371  # Earth's radius in km
    
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    
    return R * c

@api_router.get("/nearby-helpers")
async def get_nearby_helpers(lat: float, lon: float, radius_km: float = 5.0):
    """Get helpers within radius of given location"""
    helpers = await db.users.find({
        "is_helper_mode": True,
        "current_location": {"$ne": None}
    }).to_list(100)
    
    nearby = []
    for helper in helpers:
        if helper.get("current_location"):
            hlat = helper["current_location"]["latitude"]
            hlon = helper["current_location"]["longitude"]
            distance = calculate_distance(lat, lon, hlat, hlon)
            if distance <= radius_km:
                nearby.append({
                    "id": helper["id"],
                    "name": helper["name"],
                    "distance_km": round(distance, 2),
                    "location": helper["current_location"]
                })
    
    # Sort by distance
    nearby.sort(key=lambda x: x["distance_km"])
    return nearby

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== SOCKET.IO EVENTS ====================

# Track connected users: {socket_id: user_id}
connected_users: Dict[str, str] = {}
# Track user locations: {user_id: {lat, lon}}
user_locations: Dict[str, Dict[str, float]] = {}

@sio.event
async def connect(sid, environ):
    logger.info(f"Client connected: {sid}")

@sio.event
async def disconnect(sid):
    logger.info(f"Client disconnected: {sid}")
    if sid in connected_users:
        user_id = connected_users[sid]
        del connected_users[sid]
        if user_id in user_locations:
            del user_locations[user_id]
        # Update user's socket_id in database
        await db.users.update_one(
            {"id": user_id},
            {"$set": {"socket_id": None}}
        )

@sio.event
async def register_user(sid, data):
    """Register a user with their socket"""
    user_id = data.get("user_id")
    if user_id:
        connected_users[sid] = user_id
        await db.users.update_one(
            {"id": user_id},
            {"$set": {"socket_id": sid}}
        )
        logger.info(f"User {user_id} registered with socket {sid}")
        await sio.emit("registration_confirmed", {"user_id": user_id}, room=sid)

@sio.event
async def update_location(sid, data):
    """Update user's current location"""
    user_id = connected_users.get(sid)
    if user_id:
        lat = data.get("latitude")
        lon = data.get("longitude")
        user_locations[user_id] = {"latitude": lat, "longitude": lon}
        
        # Update in database
        await db.users.update_one(
            {"id": user_id},
            {"$set": {"current_location": {"latitude": lat, "longitude": lon}}}
        )
        logger.info(f"Location updated for user {user_id}: {lat}, {lon}")

@sio.event
async def trigger_sos(sid, data):
    """Handle SOS trigger - notify nearby helpers"""
    user_id = connected_users.get(sid)
    alert_id = data.get("alert_id")
    location = data.get("location")
    
    if not user_id or not alert_id or not location:
        return
    
    logger.info(f"SOS triggered by {user_id} at {location}")
    
    # Get user info
    user = await db.users.find_one({"id": user_id})
    
    # Find nearby helpers (in helper mode)
    nearby_helpers = []
    for helper_sid, helper_id in connected_users.items():
        if helper_id != user_id:
            helper = await db.users.find_one({"id": helper_id})
            if helper and helper.get("is_helper_mode") and helper.get("current_location"):
                hlat = helper["current_location"]["latitude"]
                hlon = helper["current_location"]["longitude"]
                distance = calculate_distance(
                    location["latitude"], location["longitude"],
                    hlat, hlon
                )
                if distance <= 5.0:  # Within 5km
                    nearby_helpers.append({
                        "sid": helper_sid,
                        "id": helper_id,
                        "distance": distance
                    })
    
    # Sort by distance and take first 10
    nearby_helpers.sort(key=lambda x: x["distance"])
    helpers_to_notify = nearby_helpers[:10]
    
    # Update alert with notified helpers
    notified_ids = [h["id"] for h in helpers_to_notify]
    await db.sos_alerts.update_one(
        {"id": alert_id},
        {"$set": {"helpers_notified": notified_ids}}
    )
    
    # Notify each helper
    for helper in helpers_to_notify:
        await sio.emit("sos_alert", {
            "alert_id": alert_id,
            "user": {
                "id": user["id"],
                "name": user["name"],
                "photo": user.get("photo"),
                "age": user.get("age"),
                "gender": user.get("gender")
            },
            "location": location,
            "distance_km": round(helper["distance"], 2)
        }, room=helper["sid"])
    
    # Notify the SOS sender about how many helpers were notified
    await sio.emit("sos_sent", {
        "alert_id": alert_id,
        "helpers_notified": len(helpers_to_notify),
        "message": f"SOS sent to {len(helpers_to_notify)} nearby helpers"
    }, room=sid)
    
    logger.info(f"SOS alert sent to {len(helpers_to_notify)} helpers")

@sio.event
async def respond_to_sos(sid, data):
    """Handle helper's response to SOS"""
    helper_id = connected_users.get(sid)
    alert_id = data.get("alert_id")
    response = data.get("response")  # 'accepted' or 'declined'
    
    if not helper_id or not alert_id or not response:
        return
    
    # Get helper info and location
    helper = await db.users.find_one({"id": helper_id})
    helper_location = user_locations.get(helper_id)
    
    # Save response
    helper_response = HelperResponse(
        alert_id=alert_id,
        helper_id=helper_id,
        response=response,
        helper_location=Location(**helper_location) if helper_location else None
    )
    await db.helper_responses.insert_one(helper_response.model_dump())
    
    # Update alert
    if response == "accepted":
        await db.sos_alerts.update_one(
            {"id": alert_id},
            {"$push": {"helpers_accepted": helper_id}}
        )
    else:
        await db.sos_alerts.update_one(
            {"id": alert_id},
            {"$push": {"helpers_declined": helper_id}}
        )
    
    # Get the alert to find the person who triggered SOS
    alert = await db.sos_alerts.find_one({"id": alert_id})
    if alert:
        # Find the SOS sender's socket
        sender_user = await db.users.find_one({"id": alert["user_id"]})
        if sender_user and sender_user.get("socket_id"):
            if response == "accepted":
                await sio.emit("helper_responded", {
                    "alert_id": alert_id,
                    "helper": {
                        "id": helper_id,
                        "name": helper.get("name"),
                        "photo": helper.get("photo")
                    },
                    "helper_location": helper_location,
                    "response": response
                }, room=sender_user["socket_id"])
            
            # Check if we need more helpers
            updated_alert = await db.sos_alerts.find_one({"id": alert_id})
            accepted_count = len(updated_alert.get("helpers_accepted", []))
            
            # Notify sender of current status
            await sio.emit("sos_status", {
                "alert_id": alert_id,
                "helpers_accepted": accepted_count,
                "target": 10
            }, room=sender_user["socket_id"])
    
    logger.info(f"Helper {helper_id} {response} SOS {alert_id}")

@sio.event
async def cancel_sos(sid, data):
    """Cancel an active SOS alert"""
    user_id = connected_users.get(sid)
    alert_id = data.get("alert_id")
    
    if not user_id or not alert_id:
        return
    
    # Update alert status
    await db.sos_alerts.update_one(
        {"id": alert_id},
        {"$set": {"status": "cancelled", "resolved_at": datetime.utcnow()}}
    )
    
    # Get all helpers who were notified
    alert = await db.sos_alerts.find_one({"id": alert_id})
    if alert:
        for helper_id in alert.get("helpers_notified", []):
            helper = await db.users.find_one({"id": helper_id})
            if helper and helper.get("socket_id"):
                await sio.emit("sos_cancelled", {
                    "alert_id": alert_id,
                    "message": "The SOS alert has been cancelled by the user"
                }, room=helper["socket_id"])
    
    logger.info(f"SOS {alert_id} cancelled by {user_id}")

@sio.event
async def resolve_sos(sid, data):
    """Mark SOS as resolved"""
    user_id = connected_users.get(sid)
    alert_id = data.get("alert_id")
    
    if not user_id or not alert_id:
        return
    
    await db.sos_alerts.update_one(
        {"id": alert_id},
        {"$set": {"status": "resolved", "resolved_at": datetime.utcnow()}}
    )
    
    # Notify all involved helpers
    alert = await db.sos_alerts.find_one({"id": alert_id})
    if alert:
        all_helpers = set(alert.get("helpers_notified", [])) | set(alert.get("helpers_accepted", []))
        for helper_id in all_helpers:
            helper = await db.users.find_one({"id": helper_id})
            if helper and helper.get("socket_id"):
                await sio.emit("sos_resolved", {
                    "alert_id": alert_id,
                    "message": "The emergency has been resolved. Thank you for your help!"
                }, room=helper["socket_id"])
    
    logger.info(f"SOS {alert_id} resolved")

@sio.event
async def enable_helper_mode(sid, data):
    """Enable helper mode for a user"""
    user_id = connected_users.get(sid)
    enabled = data.get("enabled", True)
    
    if user_id:
        await db.users.update_one(
            {"id": user_id},
            {"$set": {"is_helper_mode": enabled}}
        )
        logger.info(f"User {user_id} helper mode: {enabled}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# Export the socket app for uvicorn
application = socket_app
