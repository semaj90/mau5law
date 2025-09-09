package cuda

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"time"
)

// FindCudaWorkerPath returns a discovered path for the native cuda-worker executable.
// It honors the CUDA_WORKER_PATH environment variable first, then falls back to
// a set of reasonable relative candidates.
func FindCudaWorkerPath() string {
    // honor env override first
    if env := os.Getenv("CUDA_WORKER_PATH"); env != "" {
        if _, err := os.Stat(env); err == nil {
            return env
        }
    }

    candidates := []string{
        "./cuda-worker.exe",
        "./cuda-worker/cuda-worker.exe",
        "../cuda-worker/cuda-worker.exe",
        "./bin/cuda-worker.exe",
    }

    for _, p := range candidates {
        // normalize path
        fp := filepath.Clean(p)
        if _, err := os.Stat(fp); err == nil {
            return fp
        }
    }
    return ""
}

// RunExternalCudaWorker marshals req as JSON, starts the external executable, writes
// JSON to stdin and returns the parsed JSON response. The call respects the provided
// context and timeout. stderr is included in returned errors when available.
func RunExternalCudaWorker(ctx context.Context, exePath string, req interface{}, timeout time.Duration) (map[string]interface{}, error) {
    if exePath == "" {
        return nil, fmt.Errorf("no external cuda worker configured")
    }

    data, err := json.Marshal(req)
    if err != nil {
        return nil, err
    }

    // create a context with timeout derived from the parent ctx
    ctxWithTimeout, cancel := context.WithTimeout(ctx, timeout)
    defer cancel()

    cmd := exec.CommandContext(ctxWithTimeout, exePath)
    cmd.Stdin = bytes.NewReader(data)

    out, err := cmd.CombinedOutput()
    if ctxWithTimeout.Err() == context.DeadlineExceeded {
        return nil, fmt.Errorf("cuda-worker timed out after %s", timeout)
    }
    if err != nil {
        return nil, fmt.Errorf("cuda-worker failed: %v - output: %s", err, string(out))
    }

    var resp map[string]interface{}
    if err := json.Unmarshal(out, &resp); err != nil {
        return nil, fmt.Errorf("invalid JSON from cuda-worker: %v - output: %s", err, string(out))
    }
    return resp, nil
}
