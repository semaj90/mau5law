package trt

/*
bool trtEnqueueV2(void*, void**, cudaStream_t);
#include <cuda_runtime.h>
*/
import "C"

import (
	"fmt"
	"unsafe"
)

func (e *Engine) Infer(input []float32, output []float32) error {
	inputDev := mallocDevice(len(input) * 4)
	outputDev := mallocDevice(len(output) * 4)

	memcpyHtoD(inputDev, input)

	bindings := []unsafe.Pointer{
		inputDev,
		outputDev,
	}

	stream := C.cudaStream_t(nil)
	ok := C.trtEnqueueV2(
		e.Ctx,
		(**C.void)(unsafe.Pointer(&bindings[0])),
		stream,
	)
	if !ok {
		return fmt.Errorf("enqueueV2 failed")
	}

	memcpyDtoH(output, outputDev)
	return nil
}