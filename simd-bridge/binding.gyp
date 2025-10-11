{
  "targets": [
    {
      "target_name": "tensorrt_bridge",
      "sources": [ "cpp/binding.cc", "cpp/tensor_bridge.cc" ],
      "include_dirs": [ "<!(node -e \"require('node-addon-api').include\")" ],
      "cflags_cc": ["-std=c++17"],
      "libraries": []
    }
  ]
}
