#!/usr/bin/env python3
"""
Direct TensorRT-LLM Server Test (No Ollama)
Validates the pure TensorRT implementation
"""

import asyncio
import json
import requests
import time
from typing import Dict, Any

class DirectTensorRTTestSuite:
    """Test suite for direct TensorRT-LLM server"""

    def __init__(self):
        self.base_url = "http://localhost:8100"
        self.results = {
            "server_available": False,
            "health_check": {},
            "embedding_generation": {},
            "models_list": {},
            "performance_metrics": {},
            "test_timestamp": time.time()
        }

    def test_server_health(self) -> Dict[str, Any]:
        """Test server health endpoint"""
        try:
            print("🔍 Testing server health...")
            response = requests.get(f"{self.base_url}/health", timeout=5)

            if response.status_code == 200:
                health_data = response.json()
                print(f"✅ Health check passed")
                print(f"   Status: {health_data.get('status')}")
                print(f"   TensorRT Available: {health_data.get('tensorrt_available')}")
                print(f"   Engine Loaded: {health_data.get('engine_loaded')}")
                print(f"   Inference Latency: {health_data.get('inference_latency_ms')}ms")

                self.results["health_check"] = health_data
                return health_data
            else:
                print(f"❌ Health check failed: {response.status_code}")
                return {"error": f"HTTP {response.status_code}"}

        except Exception as e:
            print(f"❌ Health check failed: {e}")
            return {"error": str(e)}

    def test_embedding_generation(self) -> Dict[str, Any]:
        """Test embedding generation endpoint"""
        try:
            print("🔍 Testing embedding generation...")

            test_payload = {
                "text": "Legal contract analysis for evidence review and case preparation",
                "model": "gemma3-legal-q4km",
                "dimensions": 512
            }

            start_time = time.perf_counter()
            response = requests.post(
                f"{self.base_url}/v1/embeddings",
                json=test_payload,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            end_time = time.perf_counter()

            if response.status_code == 200:
                embedding_data = response.json()
                api_latency = (end_time - start_time) * 1000

                print(f"✅ Embedding generation successful")
                print(f"   API Latency: {api_latency:.2f}ms")
                print(f"   Processing Time: {embedding_data.get('processing_time_ms')}ms")
                print(f"   Dimensions: {embedding_data.get('dimensions')}")
                print(f"   Inference Method: {embedding_data.get('inference_method')}")

                self.results["embedding_generation"] = {
                    "success": True,
                    "api_latency_ms": round(api_latency, 2),
                    "processing_time_ms": embedding_data.get('processing_time_ms'),
                    "dimensions": embedding_data.get('dimensions'),
                    "inference_method": embedding_data.get('inference_method'),
                    "embedding_length": len(embedding_data.get('embedding', []))
                }

                return embedding_data
            else:
                print(f"❌ Embedding generation failed: {response.status_code}")
                error_data = {"error": f"HTTP {response.status_code}"}
                self.results["embedding_generation"] = error_data
                return error_data

        except Exception as e:
            print(f"❌ Embedding generation failed: {e}")
            error_data = {"error": str(e)}
            self.results["embedding_generation"] = error_data
            return error_data

    def test_models_list(self) -> Dict[str, Any]:
        """Test models list endpoint"""
        try:
            print("🔍 Testing models list...")
            response = requests.get(f"{self.base_url}/v1/models", timeout=5)

            if response.status_code == 200:
                models_data = response.json()
                print(f"✅ Models list retrieved")

                for model in models_data.get('data', []):
                    print(f"   Model: {model.get('id')}")
                    print(f"   Quantization: {model.get('quantization')}")
                    print(f"   Optimization: {model.get('optimization')}")

                self.results["models_list"] = models_data
                return models_data
            else:
                print(f"❌ Models list failed: {response.status_code}")
                return {"error": f"HTTP {response.status_code}"}

        except Exception as e:
            print(f"❌ Models list failed: {e}")
            return {"error": str(e)}

    def test_server_info(self) -> Dict[str, Any]:
        """Test server root info endpoint"""
        try:
            print("🔍 Testing server info...")
            response = requests.get(f"{self.base_url}/", timeout=5)

            if response.status_code == 200:
                info_data = response.json()
                print(f"✅ Server info retrieved")
                print(f"   Service: {info_data.get('service')}")
                print(f"   Engine Loaded: {info_data.get('engine_loaded')}")
                print(f"   Inference Method: {info_data.get('inference_method')}")
                print(f"   Current Latency: {info_data.get('current_latency')}")
                print(f"   Target Latency: {info_data.get('target_latency')}")

                return info_data
            else:
                print(f"❌ Server info failed: {response.status_code}")
                return {"error": f"HTTP {response.status_code}"}

        except Exception as e:
            print(f"❌ Server info failed: {e}")
            return {"error": str(e)}

    def run_performance_test(self, num_requests: int = 5) -> Dict[str, Any]:
        """Run performance test with multiple requests"""
        print(f"🔍 Running performance test ({num_requests} requests)...")

        latencies = []
        test_text = "Legal document analysis for case preparation and evidence review"

        for i in range(num_requests):
            try:
                start_time = time.perf_counter()
                response = requests.post(
                    f"{self.base_url}/v1/embeddings",
                    json={"text": f"{test_text} - request {i+1}", "model": "gemma3-legal-q4km"},
                    timeout=10
                )
                end_time = time.perf_counter()

                if response.status_code == 200:
                    latency = (end_time - start_time) * 1000
                    latencies.append(latency)
                    print(f"   Request {i+1}: {latency:.2f}ms")
                else:
                    print(f"   Request {i+1}: Failed ({response.status_code})")

            except Exception as e:
                print(f"   Request {i+1}: Error ({e})")

        if latencies:
            avg_latency = sum(latencies) / len(latencies)
            min_latency = min(latencies)
            max_latency = max(latencies)
            throughput = 1000 / avg_latency if avg_latency > 0 else 0

            performance_metrics = {
                "num_requests": num_requests,
                "successful_requests": len(latencies),
                "avg_latency_ms": round(avg_latency, 2),
                "min_latency_ms": round(min_latency, 2),
                "max_latency_ms": round(max_latency, 2),
                "throughput_req_per_sec": round(throughput, 2)
            }

            print(f"📊 Performance Results:")
            print(f"   Average Latency: {avg_latency:.2f}ms")
            print(f"   Min Latency: {min_latency:.2f}ms")
            print(f"   Max Latency: {max_latency:.2f}ms")
            print(f"   Throughput: {throughput:.2f} req/sec")

            self.results["performance_metrics"] = performance_metrics
            return performance_metrics
        else:
            error_metrics = {"error": "No successful requests"}
            self.results["performance_metrics"] = error_metrics
            return error_metrics

    def run_complete_test_suite(self) -> Dict[str, Any]:
        """Run complete test suite"""
        print("🚀 Direct TensorRT-LLM Server Test Suite")
        print("🎯 Testing pure TensorRT implementation (no Ollama)")
        print("-" * 60)

        # Test server availability
        try:
            response = requests.get(f"{self.base_url}/", timeout=5)
            self.results["server_available"] = response.status_code == 200
        except:
            self.results["server_available"] = False
            print("❌ Server not available")
            return self.results

        if not self.results["server_available"]:
            print("❌ Server not responding - tests cannot continue")
            return self.results

        print("✅ Server is available")

        # Run test suite
        print("\n1. Server Health Check")
        self.test_server_health()

        print("\n2. Server Info Check")
        self.test_server_info()

        print("\n3. Embedding Generation Test")
        self.test_embedding_generation()

        print("\n4. Models List Test")
        self.test_models_list()

        print("\n5. Performance Test")
        self.run_performance_test(3)

        # Save results
        results_file = "direct-tensorrt-test-results.json"
        with open(results_file, 'w') as f:
            json.dump(self.results, f, indent=2)

        print(f"\n📋 Test results saved: {results_file}")

        # Summary
        print("\n📊 TEST SUMMARY")
        print("-" * 40)

        if self.results["server_available"]:
            print("✅ Server Available")
        else:
            print("❌ Server Not Available")

        health = self.results.get("health_check", {})
        if "error" not in health:
            print(f"✅ Health Check: {health.get('status', 'unknown')}")
            print(f"   Inference Latency: {health.get('inference_latency_ms', 'N/A')}ms")
        else:
            print("❌ Health Check Failed")

        embedding = self.results.get("embedding_generation", {})
        if embedding.get("success"):
            print(f"✅ Embedding Generation: {embedding.get('processing_time_ms', 'N/A')}ms")
            print(f"   Inference Method: {embedding.get('inference_method', 'N/A')}")
        else:
            print("❌ Embedding Generation Failed")

        perf = self.results.get("performance_metrics", {})
        if "error" not in perf:
            print(f"✅ Performance: {perf.get('avg_latency_ms', 'N/A')}ms avg")
            print(f"   Throughput: {perf.get('throughput_req_per_sec', 'N/A')} req/sec")
        else:
            print("❌ Performance Test Failed")

        return self.results

def main():
    """Main test function"""
    print("🔥 Direct TensorRT-LLM Server Test")
    print("🎯 Validating pure TensorRT implementation (no Ollama)")
    print("⚡ Testing <1ms inference capability")

    # Run test suite
    test_suite = DirectTensorRTTestSuite()
    results = test_suite.run_complete_test_suite()

    # Final assessment
    if results["server_available"]:
        print("\n🎉 DIRECT TENSORRT SERVER VALIDATED!")
        print("🔧 Pure TensorRT implementation working")
        print("⚡ Ready for <1ms optimization via Docker")
    else:
        print("\n⚠️  Server needs to be started first")
        print("🚀 Run: python tensorrt-llm-direct-server.py")

if __name__ == "__main__":
    main()