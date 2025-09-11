APP?=cognitive-microservice
GOFLAGS?=

build:
	go build $(GOFLAGS) -tags cognitive -o $(APP).exe cognitive-microservice.go

build-jsonv2:
	go build $(GOFLAGS) -tags "cognitive jsonv2" -o $(APP)-jsonv2.exe cognitive-microservice.go

bench-json:
	go test -run=^$ -bench=. ./internal/xjson -count=1

.PHONY: build build-jsonv2 bench-json

# --- Metrics Full Enhancements ---
PROTO_DIR=proto/metrics
PROTO_FILE=$(PROTO_DIR)/metrics.proto

proto:
	protoc -I proto --go_out=./ --go-grpc_out=./ $(PROTO_FILE)

metrics-test:
	go test -tags metrics_full ./internal/metrics/...

metrics-bench:
	go test -tags metrics_full -bench=. -run=^$ ./internal/metrics/registry -count=1

.PHONY: proto metrics-test metrics-bench
