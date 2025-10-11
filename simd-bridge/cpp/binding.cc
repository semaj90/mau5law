#include <napi.h>

extern "C" int bridgeSIMDToTensorRT(const char* json);

Napi::Value BridgeSIMD(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "Expected a JSON string").ThrowAsJavaScriptException();
    return env.Null();
  }
  std::string json = info[0].As<Napi::String>().Utf8Value();
  int r = bridgeSIMDToTensorRT(json.c_str());
  return Napi::Number::New(env, r);
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set("bridgeSIMD", Napi::Function::New(env, BridgeSIMD));
  return exports;
}

NODE_API_MODULE(tensorrt_bridge, Init)
