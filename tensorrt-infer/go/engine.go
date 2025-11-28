package main

import (
	"fmt"
	"tensorrt-infer/go/trt"
)

func main() {
	engine, err := trt.LoadPlan("gemma3_int4.plan")
	if err != nil {
		panic(err)
	}

	input := make([]float32, 4096)   // token embeddings
	output := make([]float32, 4096)  // next-token logits

	err = engine.Infer(input, output)
	if err != nil {
		panic(err)
	}

	fmt.Println("Inference OK")
	fmt.Println(output[:10])
}