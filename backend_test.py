#!/usr/bin/env python3
"""
SafeHaven Backend API Test Suite
Tests all backend endpoints according to the review request workflow
"""

import requests
import json
import time
from typing import Dict, Any, Optional

# Configuration
BASE_URL = "https://emergency-connect-18.preview.emergentagent.com/api"

# Test data
test_user_data = {
    "name": "Sarah Johnson",
    "age": 28,
    "gender": "female",
    "photo": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=",
    "home_location": {
        "latitude": 37.7749,
        "longitude": -122.4194,
        "address": "123 Main St, San Francisco, CA",
        "type": "home"
    },
    "work_location": {
        "latitude": 37.7849,
        "longitude": -122.4094,
        "address": "456 Business Ave, San Francisco, CA", 
        "type": "work"
    }
}

emergency_contacts_data = [
    {
        "name": "John Johnson",
        "phone": "+1-555-0101",
        "relationship": "spouse"
    },
    {
        "name": "Mary Smith",
        "phone": "+1-555-0102",
        "relationship": "sister"
    },
    {
        "name": "Dr. Wilson",
        "phone": "+1-555-0103",
        "relationship": "doctor"
    }
]

sos_location_data = {
    "latitude": 37.7849,
    "longitude": -122.4194
}


class APITester:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.user_id: Optional[str] = None
        self.contact_ids: list = []
        self.alert_id: Optional[str] = None
        self.test_results = {
            'passed': 0,
            'failed': 0,
            'errors': []
        }
    
    def log_result(self, test_name: str, success: bool, message: str = ""):
        if success:
            self.test_results['passed'] += 1
            print(f"✅ {test_name}: PASS {message}")
        else:
            self.test_results['failed'] += 1
            self.test_results['errors'].append(f"{test_name}: {message}")
            print(f"❌ {test_name}: FAIL {message}")
    
    def test_api_root(self) -> bool:
        """Test API root endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/")
            if response.status_code == 200:
                data = response.json()
                if "SafeHaven" in data.get("message", ""):
                    self.log_result("API Root", True, f"Status: {response.status_code}")
                    return True
            self.log_result("API Root", False, f"Unexpected response: {response.status_code}")
            return False
        except Exception as e:
            self.log_result("API Root", False, f"Exception: {str(e)}")
            return False
    
    def test_create_user(self) -> bool:
        """Test user creation endpoint"""
        try:
            response = self.session.post(f"{self.base_url}/users", json=test_user_data)
            if response.status_code == 200:
                data = response.json()
                self.user_id = data.get("id")
                if self.user_id and data.get("name") == test_user_data["name"]:
                    self.log_result("Create User", True, f"User ID: {self.user_id}")
                    return True
            self.log_result("Create User", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
        except Exception as e:
            self.log_result("Create User", False, f"Exception: {str(e)}")
            return False
    
    def test_get_user(self) -> bool:
        """Test get user by ID endpoint"""
        if not self.user_id:
            self.log_result("Get User", False, "No user ID available")
            return False
        
        try:
            response = self.session.get(f"{self.base_url}/users/{self.user_id}")
            if response.status_code == 200:
                data = response.json()
                if data.get("id") == self.user_id and data.get("name") == test_user_data["name"]:
                    self.log_result("Get User", True, f"Retrieved user: {data.get('name')}")
                    return True
            self.log_result("Get User", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
        except Exception as e:
            self.log_result("Get User", False, f"Exception: {str(e)}")
            return False
    
    def test_update_user(self) -> bool:
        """Test user update endpoint"""
        if not self.user_id:
            self.log_result("Update User", False, "No user ID available")
            return False
        
        update_data = {
            "name": "Sarah Johnson Updated",
            "current_location": {
                "latitude": 37.7949,
                "longitude": -122.4294,
                "type": "current"
            }
        }
        
        try:
            response = self.session.put(f"{self.base_url}/users/{self.user_id}", json=update_data)
            if response.status_code == 200:
                data = response.json()
                if data.get("name") == update_data["name"]:
                    self.log_result("Update User", True, f"Updated name: {data.get('name')}")
                    return True
            self.log_result("Update User", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
        except Exception as e:
            self.log_result("Update User", False, f"Exception: {str(e)}")
            return False
    
    def test_get_all_users(self) -> bool:
        """Test get all users endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/users")
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    self.log_result("Get All Users", True, f"Found {len(data)} users")
                    return True
                else:
                    self.log_result("Get All Users", True, "No users found (empty list)")
                    return True
            self.log_result("Get All Users", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
        except Exception as e:
            self.log_result("Get All Users", False, f"Exception: {str(e)}")
            return False
    
    def test_create_contacts(self) -> bool:
        """Test emergency contacts creation"""
        if not self.user_id:
            self.log_result("Create Contacts", False, "No user ID available")
            return False
        
        all_success = True
        for contact_data in emergency_contacts_data:
            contact_payload = {**contact_data, "user_id": self.user_id}
            try:
                response = self.session.post(f"{self.base_url}/contacts", json=contact_payload)
                if response.status_code == 200:
                    data = response.json()
                    contact_id = data.get("id")
                    if contact_id and data.get("name") == contact_data["name"]:
                        self.contact_ids.append(contact_id)
                        print(f"  ✅ Contact created: {contact_data['name']} - {contact_id}")
                    else:
                        print(f"  ❌ Invalid contact response for {contact_data['name']}")
                        all_success = False
                else:
                    print(f"  ❌ Failed to create contact {contact_data['name']}: {response.status_code}")
                    all_success = False
            except Exception as e:
                print(f"  ❌ Exception creating contact {contact_data['name']}: {str(e)}")
                all_success = False
        
        self.log_result("Create Contacts", all_success, f"Created {len(self.contact_ids)} contacts")
        return all_success
    
    def test_get_user_contacts(self) -> bool:
        """Test get contacts for user"""
        if not self.user_id:
            self.log_result("Get User Contacts", False, "No user ID available")
            return False
        
        try:
            response = self.session.get(f"{self.base_url}/contacts/{self.user_id}")
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) == len(emergency_contacts_data):
                    self.log_result("Get User Contacts", True, f"Retrieved {len(data)} contacts")
                    return True
                else:
                    self.log_result("Get User Contacts", False, f"Expected {len(emergency_contacts_data)} contacts, got {len(data) if isinstance(data, list) else 'invalid'}")
                    return False
            self.log_result("Get User Contacts", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
        except Exception as e:
            self.log_result("Get User Contacts", False, f"Exception: {str(e)}")
            return False
    
    def test_create_sos_alert(self) -> bool:
        """Test SOS alert creation"""
        if not self.user_id:
            self.log_result("Create SOS Alert", False, "No user ID available")
            return False
        
        sos_data = {
            "user_id": self.user_id,
            "location": sos_location_data
        }
        
        try:
            response = self.session.post(f"{self.base_url}/sos", json=sos_data)
            if response.status_code == 200:
                data = response.json()
                self.alert_id = data.get("id")
                if self.alert_id and data.get("status") == "active":
                    self.log_result("Create SOS Alert", True, f"Alert ID: {self.alert_id}")
                    return True
            self.log_result("Create SOS Alert", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
        except Exception as e:
            self.log_result("Create SOS Alert", False, f"Exception: {str(e)}")
            return False
    
    def test_get_sos_alert(self) -> bool:
        """Test get SOS alert by ID"""
        if not self.alert_id:
            self.log_result("Get SOS Alert", False, "No alert ID available")
            return False
        
        try:
            response = self.session.get(f"{self.base_url}/sos/{self.alert_id}")
            if response.status_code == 200:
                data = response.json()
                if data.get("id") == self.alert_id and data.get("user_id") == self.user_id:
                    self.log_result("Get SOS Alert", True, f"Status: {data.get('status')}")
                    return True
            self.log_result("Get SOS Alert", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
        except Exception as e:
            self.log_result("Get SOS Alert", False, f"Exception: {str(e)}")
            return False
    
    def test_get_user_alerts(self) -> bool:
        """Test get user's alerts"""
        if not self.user_id:
            self.log_result("Get User Alerts", False, "No user ID available")
            return False
        
        try:
            response = self.session.get(f"{self.base_url}/sos/user/{self.user_id}")
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    self.log_result("Get User Alerts", True, f"Found {len(data)} alerts")
                    return True
                else:
                    self.log_result("Get User Alerts", True, "No alerts found (empty list)")
                    return True
            self.log_result("Get User Alerts", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
        except Exception as e:
            self.log_result("Get User Alerts", False, f"Exception: {str(e)}")
            return False
    
    def test_get_active_alerts(self) -> bool:
        """Test get all active alerts"""
        try:
            response = self.session.get(f"{self.base_url}/sos/active/all")
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    active_count = len([alert for alert in data if alert.get("status") == "active"])
                    self.log_result("Get Active Alerts", True, f"Found {active_count} active alerts")
                    return True
            self.log_result("Get Active Alerts", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
        except Exception as e:
            self.log_result("Get Active Alerts", False, f"Exception: {str(e)}")
            return False
    
    def test_mock_notifications(self) -> bool:
        """Test mock notifications for alert"""
        if not self.alert_id:
            self.log_result("Mock Notifications", False, "No alert ID available")
            return False
        
        # Wait a moment for notifications to be created
        time.sleep(1)
        
        try:
            response = self.session.get(f"{self.base_url}/notifications/{self.alert_id}")
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    sms_notifications = [n for n in data if n.get("type") == "sms"]
                    police_notifications = [n for n in data if n.get("type") == "police"]
                    
                    # Should have SMS notifications for each contact + 1 police notification
                    expected_sms = len(self.contact_ids)
                    if len(sms_notifications) == expected_sms and len(police_notifications) == 1:
                        self.log_result("Mock Notifications", True, f"Found {len(sms_notifications)} SMS + {len(police_notifications)} police notifications")
                        return True
                    else:
                        self.log_result("Mock Notifications", False, f"Expected {expected_sms} SMS + 1 police, got {len(sms_notifications)} SMS + {len(police_notifications)} police")
                        return False
                else:
                    self.log_result("Mock Notifications", False, f"Invalid response format: {response.text}")
                    return False
            self.log_result("Mock Notifications", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
        except Exception as e:
            self.log_result("Mock Notifications", False, f"Exception: {str(e)}")
            return False
    
    def test_ai_chat(self) -> bool:
        """Test AI therapy chat endpoint"""
        if not self.user_id:
            self.log_result("AI Chat", False, "No user ID available")
            return False
        
        chat_data = {
            "user_id": self.user_id,
            "content": "I'm feeling very anxious today and need some support"
        }
        
        try:
            response = self.session.post(f"{self.base_url}/chat", json=chat_data)
            if response.status_code == 200:
                data = response.json()
                if data.get("role") == "assistant" and data.get("user_id") == self.user_id:
                    content = data.get("content", "")
                    if len(content) > 10:  # Basic check for meaningful response
                        self.log_result("AI Chat", True, f"Response length: {len(content)} chars")
                        return True
                    else:
                        self.log_result("AI Chat", False, f"Response too short: '{content}'")
                        return False
            self.log_result("AI Chat", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
        except Exception as e:
            self.log_result("AI Chat", False, f"Exception: {str(e)}")
            return False
    
    def test_get_chat_history(self) -> bool:
        """Test get chat history endpoint"""
        if not self.user_id:
            self.log_result("Get Chat History", False, "No user ID available")
            return False
        
        try:
            response = self.session.get(f"{self.base_url}/chat/{self.user_id}")
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) >= 2:  # Should have user message + AI response
                    user_msgs = [msg for msg in data if msg.get("role") == "user"]
                    assistant_msgs = [msg for msg in data if msg.get("role") == "assistant"]
                    if len(user_msgs) >= 1 and len(assistant_msgs) >= 1:
                        self.log_result("Get Chat History", True, f"Found {len(user_msgs)} user + {len(assistant_msgs)} AI messages")
                        return True
                self.log_result("Get Chat History", False, f"Unexpected chat history: {len(data) if isinstance(data, list) else 'invalid'} messages")
                return False
            self.log_result("Get Chat History", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
        except Exception as e:
            self.log_result("Get Chat History", False, f"Exception: {str(e)}")
            return False
    
    def test_guided_exercises(self) -> bool:
        """Test guided exercises endpoints"""
        try:
            # Test get all exercises
            response = self.session.get(f"{self.base_url}/exercises")
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    exercise_ids = [ex.get("id") for ex in data]
                    
                    # Test get specific exercise
                    if exercise_ids:
                        exercise_id = exercise_ids[0]
                        detail_response = self.session.get(f"{self.base_url}/exercises/{exercise_id}")
                        if detail_response.status_code == 200:
                            exercise_detail = detail_response.json()
                            if exercise_detail.get("id") == exercise_id:
                                self.log_result("Guided Exercises", True, f"Found {len(data)} exercises, tested detail for '{exercise_detail.get('title')}'")
                                return True
                    
                    self.log_result("Guided Exercises", False, "Could not test exercise detail endpoint")
                    return False
                else:
                    self.log_result("Guided Exercises", False, f"No exercises found: {data}")
                    return False
            self.log_result("Guided Exercises", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
        except Exception as e:
            self.log_result("Guided Exercises", False, f"Exception: {str(e)}")
            return False
    
    def test_resolve_sos_alert(self) -> bool:
        """Test resolving SOS alert"""
        if not self.alert_id:
            self.log_result("Resolve SOS Alert", False, "No alert ID available")
            return False
        
        try:
            response = self.session.put(f"{self.base_url}/sos/{self.alert_id}/resolve")
            if response.status_code == 200:
                data = response.json()
                if "resolved" in data.get("message", "").lower():
                    # Verify the alert is actually resolved
                    verify_response = self.session.get(f"{self.base_url}/sos/{self.alert_id}")
                    if verify_response.status_code == 200:
                        verify_data = verify_response.json()
                        if verify_data.get("status") == "resolved":
                            self.log_result("Resolve SOS Alert", True, "Alert status updated to resolved")
                            return True
                        else:
                            self.log_result("Resolve SOS Alert", False, f"Alert status not updated: {verify_data.get('status')}")
                            return False
            self.log_result("Resolve SOS Alert", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
        except Exception as e:
            self.log_result("Resolve SOS Alert", False, f"Exception: {str(e)}")
            return False
    
    def test_delete_contact(self) -> bool:
        """Test deleting an emergency contact"""
        if not self.contact_ids:
            self.log_result("Delete Contact", False, "No contact IDs available")
            return False
        
        contact_to_delete = self.contact_ids[0]
        
        try:
            response = self.session.delete(f"{self.base_url}/contacts/{contact_to_delete}")
            if response.status_code == 200:
                data = response.json()
                if "deleted" in data.get("message", "").lower():
                    # Verify contact is deleted by checking user contacts
                    verify_response = self.session.get(f"{self.base_url}/contacts/{self.user_id}")
                    if verify_response.status_code == 200:
                        remaining_contacts = verify_response.json()
                        remaining_ids = [c.get("id") for c in remaining_contacts]
                        if contact_to_delete not in remaining_ids:
                            self.log_result("Delete Contact", True, f"Contact {contact_to_delete} successfully deleted")
                            return True
                        else:
                            self.log_result("Delete Contact", False, "Contact still exists after deletion")
                            return False
            self.log_result("Delete Contact", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
        except Exception as e:
            self.log_result("Delete Contact", False, f"Exception: {str(e)}")
            return False
    
    def test_clear_chat_history(self) -> bool:
        """Test clearing chat history"""
        if not self.user_id:
            self.log_result("Clear Chat History", False, "No user ID available")
            return False
        
        try:
            response = self.session.delete(f"{self.base_url}/chat/{self.user_id}")
            if response.status_code == 200:
                # Verify chat history is cleared
                verify_response = self.session.get(f"{self.base_url}/chat/{self.user_id}")
                if verify_response.status_code == 200:
                    chat_history = verify_response.json()
                    if isinstance(chat_history, list) and len(chat_history) == 0:
                        self.log_result("Clear Chat History", True, "Chat history successfully cleared")
                        return True
                    else:
                        self.log_result("Clear Chat History", False, f"Chat history not cleared: {len(chat_history)} messages remain")
                        return False
            self.log_result("Clear Chat History", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
        except Exception as e:
            self.log_result("Clear Chat History", False, f"Exception: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all API tests in the specified workflow order"""
        print(f"🚀 Starting SafeHaven API Tests")
        print(f"📍 Base URL: {self.base_url}")
        print("=" * 60)
        
        # Test API availability
        self.test_api_root()
        
        # 1. Create a user
        print("\n📝 STEP 1: User Profile CRUD Tests")
        self.test_create_user()
        self.test_get_user() 
        self.test_update_user()
        self.test_get_all_users()
        
        # 2. Add emergency contacts for the user
        print("\n📞 STEP 2: Emergency Contacts Tests") 
        self.test_create_contacts()
        self.test_get_user_contacts()
        
        # 3. Trigger an SOS alert
        print("\n🚨 STEP 3: SOS Alert System Tests")
        self.test_create_sos_alert()
        self.test_get_sos_alert()
        self.test_get_user_alerts()
        self.test_get_active_alerts()
        
        # 4. Verify mock notifications were created
        print("\n📢 STEP 4: Mock Notifications Tests")
        self.test_mock_notifications()
        
        # 5. Test AI chat endpoint
        print("\n🤖 STEP 5: AI Therapy Chat Tests")
        self.test_ai_chat()
        self.test_get_chat_history()
        
        # 6. Test exercises endpoints  
        print("\n🧘 STEP 6: Guided Exercises Tests")
        self.test_guided_exercises()
        
        # 7. Resolve the SOS
        print("\n✅ STEP 7: Resolve SOS Alert")
        self.test_resolve_sos_alert()
        
        # Additional CRUD tests
        print("\n🗑️ STEP 8: Additional CRUD Tests")
        self.test_delete_contact()
        self.test_clear_chat_history()
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"✅ Passed: {self.test_results['passed']}")
        print(f"❌ Failed: {self.test_results['failed']}")
        print(f"📈 Success Rate: {(self.test_results['passed'] / (self.test_results['passed'] + self.test_results['failed']) * 100):.1f}%")
        
        if self.test_results['errors']:
            print("\n❌ FAILED TESTS:")
            for error in self.test_results['errors']:
                print(f"  • {error}")
        
        return self.test_results['failed'] == 0


if __name__ == "__main__":
    tester = APITester(BASE_URL)
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 ALL TESTS PASSED!")
    else:
        print(f"\n⚠️ {tester.test_results['failed']} TESTS FAILED")
    
    exit(0 if success else 1)