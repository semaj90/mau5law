#!/usr/bin/env python3
"""
Test script for LangChain + SSE RAG Integration
Demonstrates the complete pipeline from document chunking to streaming responses
"""

import asyncio
import time
import json
import requests
from typing import Dict, Any

# Service URLs
SSE_SERVICE = "http://localhost:9003"
LANGCHAIN_SERVICE = "http://localhost:9004"

class SSEClient:
    """Simple SSE client for testing"""
    def __init__(self, client_id: str):
        self.client_id = client_id
        self.events = []
    
    def connect_and_listen(self, duration=30):
        """Connect to SSE and collect events"""
        import sseclient
        response = requests.get(f"{SSE_SERVICE}/api/v1/sse", 
                              params={"client_id": self.client_id},
                              stream=True)
        
        client = sseclient.SSEClient(response)
        start_time = time.time()
        
        for event in client.events():
            if time.time() - start_time > duration:
                break
                
            if event.data:
                try:
                    event_data = json.loads(event.data)
                    self.events.append(event_data)
                    print(f"[{event.event}] {event_data}")
                except json.JSONDecodeError:
                    pass

def test_basic_sse_rag():
    """Test the basic SSE RAG pipeline"""
    print("\n🧪 Testing Basic SSE RAG Pipeline...")
    
    client_id = "test_basic_rag"
    
    # Trigger RAG query
    response = requests.post(f"{SSE_SERVICE}/api/v1/rag",
                           params={"client_id": client_id},
                           json={
                               "query": "What is consideration in contract law?",
                               "stream": True,
                               "max_results": 3
                           })
    
    print(f"RAG Response: {response.json()}")
    return client_id

def test_langchain_chunking():
    """Test document chunking with LangChain"""
    print("\n📄 Testing LangChain Document Chunking...")
    
    sample_contract = """
    SERVICE AGREEMENT
    
    This Service Agreement ("Agreement") is entered into on [Date] between Company A ("Client") 
    and Company B ("Service Provider").
    
    1. SCOPE OF SERVICES
    Service Provider agrees to provide the following services:
    - Legal consultation and advice
    - Contract review and drafting
    - Regulatory compliance assessment
    
    2. CONSIDERATION
    Client agrees to pay Service Provider a fee of $10,000 for the services described herein.
    Payment shall be made within 30 days of completion of services.
    
    3. TERM AND TERMINATION
    This Agreement shall commence on [Start Date] and continue until completion of services
    unless terminated earlier by either party with 30 days written notice.
    
    4. CONFIDENTIALITY
    Both parties agree to maintain confidentiality of all proprietary information shared
    during the course of this engagement.
    """
    
    try:
        response = requests.post(f"{LANGCHAIN_SERVICE}/api/v1/documents/chunk",
                               json={
                                   "content": sample_contract,
                                   "case_id": 1,
                                   "title": "Sample Service Agreement",
                                   "metadata": {
                                       "contract_type": "service",
                                       "jurisdiction": "US",
                                       "test": True
                                   }
                               })
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Chunking started: {result}")
            return result.get("client_id")
        else:
            print(f"❌ Chunking failed: {response.text}")
            return None
    except requests.exceptions.ConnectionError:
        print("❌ LangChain service not running on port 9004")
        return None

def test_enhanced_rag():
    """Test enhanced RAG with LangChain"""
    print("\n🧠 Testing Enhanced RAG with Chain-of-Thought...")
    
    client_id = "test_enhanced_rag"
    
    try:
        response = requests.post(f"{LANGCHAIN_SERVICE}/api/v1/rag/enhanced",
                               json={
                                   "query": "What are the key terms every service contract should include?",
                                   "case_id": 1,
                                   "client_id": client_id,
                                   "enable_summarization": True,
                                   "enable_chain_of_thought": True
                               })
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Enhanced RAG started: {result}")
            return client_id
        else:
            print(f"❌ Enhanced RAG failed: {response.text}")
            return None
    except requests.exceptions.ConnectionError:
        print("❌ LangChain service not running on port 9004")
        return None

def test_case_summarization():
    """Test case summarization"""
    print("\n📋 Testing Case Summarization...")
    
    client_id = "test_summarization"
    
    try:
        response = requests.post(f"{LANGCHAIN_SERVICE}/api/v1/cases/1/summarize",
                               params={"client_id": client_id})
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Summarization started: {result}")
            return client_id
        else:
            print(f"❌ Summarization failed: {response.text}")
            return None
    except requests.exceptions.ConnectionError:
        print("❌ LangChain service not running on port 9004")
        return None

def test_services_health():
    """Test health of all services"""
    print("\n🏥 Testing Service Health...")
    
    # Test SSE service
    try:
        sse_health = requests.get(f"{SSE_SERVICE}/api/v1/health").json()
        print(f"✅ SSE Service: {sse_health['status']} - {sse_health['service']}")
    except:
        print("❌ SSE Service not available")
        return False
    
    # Test LangChain service
    try:
        lc_health = requests.get(f"{LANGCHAIN_SERVICE}/api/v1/health").json()
        print(f"✅ LangChain Service: {lc_health['status']} - {lc_health['service']}")
    except:
        print("❌ LangChain Service not available")
        return False
    
    return True

def main():
    """Run all integration tests"""
    print("🚀 LangChain + SSE RAG Integration Test Suite")
    print("=" * 50)
    
    # Check service health first
    if not test_services_health():
        print("\n❌ Services not available. Please start:")
        print("1. SSE RAG Service: cd sse-rag-service && ./sse-rag-service")  
        print("2. LangChain Service: cd langchain-rag-service && python main.py")
        return
    
    print("\n✅ All services are healthy!")
    
    # Test basic RAG first
    basic_client = test_basic_rag()
    
    # Test LangChain features
    chunk_client = test_langchain_chunking()
    enhanced_client = test_enhanced_rag()
    summary_client = test_case_summarization()
    
    print(f"\n🎯 Integration Tests Complete!")
    print(f"📊 Results Summary:")
    print(f"   • Basic RAG: {'✅' if basic_client else '❌'}")
    print(f"   • Document Chunking: {'✅' if chunk_client else '❌'}")
    print(f"   • Enhanced RAG: {'✅' if enhanced_client else '❌'}")
    print(f"   • Case Summarization: {'✅' if summary_client else '❌'}")
    
    if chunk_client or enhanced_client or summary_client:
        print(f"\n💡 To see live SSE events, connect to:")
        if chunk_client:
            print(f"   curl -N -H 'Accept: text/event-stream' '{SSE_SERVICE}/api/v1/sse?client_id={chunk_client}'")
        if enhanced_client:
            print(f"   curl -N -H 'Accept: text/event-stream' '{SSE_SERVICE}/api/v1/sse?client_id={enhanced_client}'")

if __name__ == "__main__":
    main()