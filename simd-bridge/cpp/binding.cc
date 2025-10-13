#include <napi.h>
#include <string> // added to ensure std::string is properly declared

extern "C" int bridgeSIMDToTensorRT(const char* json);

Napi::Value BridgeSIMD(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "Expected a JSON string").ThrowAsJavaScriptException();
    return env.Null();
  }
  // Use ToString() for conversion to avoid potential As<T> pitfalls
  std::string json = info[0].ToString().Utf8Value();
  int r = bridgeSIMDToTensorRT(json.c_str());
  return Napi::Number::New(env, r);
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set("bridgeSIMD", Napi::Function::New(env, BridgeSIMD));
  return exports;
}

NODE_API_MODULE(tensorrt_bridge, Init);
