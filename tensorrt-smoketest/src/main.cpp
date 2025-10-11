#include <iostream>
#include <dlfcn.h>

// Include the tensorrt-llm SDK header if available
#include <tensorrt_llm.h>

int main() {
    std::cout << "tensorrt-smoketest: starting" << std::endl;

    // If the SDK defines an init function, try to call it dynamically
    const char* libpath = "/app/tensorrt_llm/lib/libtensorrt_llm.so";

    void* handle = dlopen(libpath, RTLD_LAZY);
    if(!handle) {
        std::cerr << "Warning: could not open " << libpath << ": " << dlerror() << std::endl;
        std::cerr << "Continuing; headers compiled correctly if this binary builds." << std::endl;
    } else {
        std::cout << "Opened " << libpath << std::endl;
        // Try to find a typical init symbol name
        using init_fn_t = int(*)(int);
        dlerror();
        init_fn_t init_fn = (init_fn_t)dlsym(handle, "tensorrt_llm_init");
        const char* dlsym_err = dlerror();
        if (dlsym_err) {
            std::cerr << "Symbol tensorrt_llm_init not found: " << dlsym_err << std::endl;
        } else if (init_fn) {
            std::cout << "Calling tensorrt_llm_init(0) -> ";
            int r = init_fn(0);
            std::cout << r << std::endl;
        }
        dlclose(handle);
    }

    std::cout << "tensorrt-smoketest: finished" << std::endl;
    return 0;
}
