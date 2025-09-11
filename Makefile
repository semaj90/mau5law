APP?=cognitive-microservice
GOFLAGS?=

build:
	go build $(GOFLAGS) -tags cognitive -o $(APP).exe cognitive-microservice.go

build-jsonv2:
	go build $(GOFLAGS) -tags "cognitive jsonv2" -o $(APP)-jsonv2.exe cognitive-microservice.go

bench-json:
	go test -run=^$ -bench=. ./internal/xjson -count=1

.PHONY: build build-jsonv2 bench-json
