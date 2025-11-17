#include <torch/torch.h>
#include <iostream>
#include <fstream>
#include <vector>
#include <string>
#include <unordered_map>
#include <algorithm>
#include <thread>
#include <future>
#include <nlohmann/json.hpp>
#include <grpcpp/grpcpp.h>
#include "qlora_training.grpc.pb.h"

// Phase AST: Dataset Ingestion Pipeline (JSON → tokenized → sharded)
class DatasetIngestionPipeline {
private:
    std::string tokenizer_name_;
    int max_seq_length_;
    int vocab_size_;
    bool shuffle_;
    float train_split_;
    std::unordered_map<std::string, std::string> preprocessing_config_;

    // Tokenization and processing
    std::unique_ptr<torch::jit::Module> tokenizer_model_;
    std::vector<std::vector<int64_t>> tokenized_data_;
    std::vector<std::string> raw_texts_;

    // Sharding parameters
    int num_shards_;
    int shard_size_;
    std::string output_format_; // "pt", "bin", "arrow"

    // Performance metrics
    size_t total_samples_processed_ = 0;
    size_t total_tokens_ = 0;
    std::chrono::steady_clock::time_point start_time_;

public:
    DatasetIngestionPipeline(
        const std::string& tokenizer_name = "google/gemma-3-4b-it",
        int max_seq_length = 2048,
        int num_shards = 8,
        const std::string& output_format = "pt"
    ) : tokenizer_name_(tokenizer_name),
        max_seq_length_(max_seq_length),
        num_shards_(num_shards),
        output_format_(output_format),
        shuffle_(true),
        train_split_(0.9f) {

        start_time_ = std::chrono::steady_clock::now();
        load_tokenizer();
        std::cout << "Phase AST Dataset Ingestion Pipeline initialized" << std::endl;
    }

    // Load tokenizer model
    void load_tokenizer() {
        try {
            // Load tokenizer from HuggingFace or local path
            std::string tokenizer_path = "tokenizers/" + tokenizer_name_;
            tokenizer_model_ = torch::jit::load(tokenizer_path);
            std::cout << "Loaded tokenizer: " << tokenizer_name_ << std::endl;

            // Get vocabulary size (would be determined from tokenizer config)
            vocab_size_ = 32000; // Placeholder for Gemma-3 vocab size

        } catch (const std::exception& e) {
            std::cerr << "Failed to load tokenizer: " << e.what() << std::endl;
            // Fallback to basic tokenization
            vocab_size_ = 32000;
        }
    }

    // Load JSON dataset
    bool load_json_dataset(const std::string& json_path) {
        try {
            std::ifstream file(json_path);
            if (!file.is_open()) {
                std::cerr << "Failed to open JSON file: " << json_path << std::endl;
                return false;
            }

            nlohmann::json json_data;
            file >> json_data;

            std::cout << "Loading JSON dataset from: " << json_path << std::endl;

            // Process JSON data (assuming array of objects with "text" field)
            if (json_data.is_array()) {
                for (const auto& item : json_data) {
                    if (item.contains("text")) {
                        std::string text = item["text"];
                        raw_texts_.push_back(text);
                    }
                }
            }

            std::cout << "Loaded " << raw_texts_.size() << " text samples" << std::endl;
            return true;

        } catch (const std::exception& e) {
            std::cerr << "Error loading JSON dataset: " << e.what() << std::endl;
            return false;
        }
    }

    // Parallel tokenization with preprocessing
    void tokenize_dataset_parallel(int num_threads = 8) {
        std::cout << "Tokenizing dataset with " << num_threads << " threads..." << std::endl;

        // Split data into chunks for parallel processing
        size_t chunk_size = raw_texts_.size() / num_threads;
        std::vector<std::future<std::vector<std::vector<int64_t>>>> futures;

        for (int i = 0; i < num_threads; ++i) {
            size_t start_idx = i * chunk_size;
            size_t end_idx = (i == num_threads - 1) ? raw_texts_.size() : (i + 1) * chunk_size;

            futures.push_back(std::async(std::launch::async, [this, start_idx, end_idx]() {
                return tokenize_chunk(start_idx, end_idx);
            }));
        }

        // Collect results
        tokenized_data_.clear();
        for (auto& future : futures) {
            auto chunk_result = future.get();
            tokenized_data_.insert(tokenized_data_.end(), chunk_result.begin(), chunk_result.end());
        }

        std::cout << "Tokenization complete. Total samples: " << tokenized_data_.size() << std::endl;
    }

    // Tokenize a chunk of texts
    std::vector<std::vector<int64_t>> tokenize_chunk(size_t start_idx, size_t end_idx) {
        std::vector<std::vector<int64_t>> chunk_tokens;

        for (size_t i = start_idx; i < end_idx; ++i) {
            if (i >= raw_texts_.size()) break;

            std::string text = raw_texts_[i];

            // Apply preprocessing
            text = preprocess_text(text);

            // Tokenize
            std::vector<int64_t> tokens = tokenize_text(text);

            // Truncate or pad to max_seq_length
            if (tokens.size() > max_seq_length_) {
                tokens.resize(max_seq_length_);
            } else if (tokens.size() < max_seq_length_) {
                tokens.insert(tokens.end(), max_seq_length_ - tokens.size(), 0); // Pad with zeros
            }

            chunk_tokens.push_back(tokens);
            total_samples_processed_++;
            total_tokens_ += tokens.size();
        }

        return chunk_tokens;
    }

    // Preprocess text according to configuration
    std::string preprocess_text(const std::string& text) {
        std::string processed = text;

        // Apply preprocessing rules from config
        if (preprocessing_config_.count("lowercase") && preprocessing_config_["lowercase"] == "true") {
            std::transform(processed.begin(), processed.end(), processed.begin(), ::tolower);
        }

        if (preprocessing_config_.count("remove_special_chars") && preprocessing_config_["remove_special_chars"] == "true") {
            // Remove special characters (simplified)
            processed.erase(std::remove_if(processed.begin(), processed.end(),
                         [](char c) { return !std::isalnum(c) && !std::isspace(c); }), processed.end());
        }

        return processed;
    }

    // Tokenize individual text (placeholder implementation)
    std::vector<int64_t> tokenize_text(const std::string& text) {
        std::vector<int64_t> tokens;

        if (tokenizer_model_) {
            // Use actual tokenizer model
            // This would call the tokenizer forward pass
            // tokens = tokenizer_model_->forward(text);
        } else {
            // Fallback: simple character-level tokenization
            for (char c : text) {
                tokens.push_back(static_cast<int64_t>(c) % vocab_size_);
            }
        }

        return tokens;
    }

    // Shuffle dataset if requested
    void shuffle_dataset() {
        if (!shuffle_) return;

        std::vector<size_t> indices(tokenized_data_.size());
        std::iota(indices.begin(), indices.end(), 0);
        std::shuffle(indices.begin(), indices.end(), std::mt19937{std::random_device{}()});

        std::vector<std::vector<int64_t>> shuffled_data;
        shuffled_data.reserve(tokenized_data_.size());

        for (size_t idx : indices) {
            shuffled_data.push_back(tokenized_data_[idx]);
        }

        tokenized_data_ = std::move(shuffled_data);
        std::cout << "Dataset shuffled" << std::endl;
    }

    // Create train/validation split
    std::pair<std::vector<std::vector<int64_t>>, std::vector<std::vector<int64_t>>>
    create_train_val_split() {

        size_t train_size = static_cast<size_t>(tokenized_data_.size() * train_split_);
        size_t val_size = tokenized_data_.size() - train_size;

        std::vector<std::vector<int64_t>> train_data(
            tokenized_data_.begin(),
            tokenized_data_.begin() + train_size
        );

        std::vector<std::vector<int64_t>> val_data(
            tokenized_data_.begin() + train_size,
            tokenized_data_.end()
        );

        std::cout << "Created train/val split: " << train_size << " train, " << val_size << " val" << std::endl;

        return {train_data, val_data};
    }

    // Shard and save dataset
    bool shard_and_save(const std::string& output_dir) {
        std::cout << "Sharding dataset into " << num_shards_ << " shards..." << std::endl;

        shard_size_ = tokenized_data_.size() / num_shards_;

        for (int shard_idx = 0; shard_idx < num_shards_; ++shard_idx) {
            size_t start_idx = shard_idx * shard_size_;
            size_t end_idx = (shard_idx == num_shards_ - 1) ?
                            tokenized_data_.size() : (shard_idx + 1) * shard_size_;

            std::vector<std::vector<int64_t>> shard_data(
                tokenized_data_.begin() + start_idx,
                tokenized_data_.begin() + end_idx
            );

            std::string shard_filename = output_dir + "/shard_" +
                                       std::to_string(shard_idx) + "." + output_format_;

            if (!save_shard(shard_data, shard_filename)) {
                std::cerr << "Failed to save shard " << shard_idx << std::endl;
                return false;
            }

            std::cout << "Saved shard " << shard_idx << " with " << shard_data.size() << " samples" << std::endl;
        }

        return true;
    }

    // Save individual shard
    bool save_shard(const std::vector<std::vector<int64_t>>& shard_data, const std::string& filename) {
        try {
            if (output_format_ == "pt") {
                // Save as PyTorch tensor
                std::vector<torch::Tensor> tensors;
                for (const auto& seq : shard_data) {
                    tensors.push_back(torch::tensor(seq, torch::kLong));
                }

                auto stacked = torch::stack(tensors);
                torch::save(stacked, filename);

            } else if (output_format_ == "bin") {
                // Save as binary format
                std::ofstream file(filename, std::ios::binary);
                if (!file.is_open()) return false;

                // Write header
                uint32_t num_samples = shard_data.size();
                uint32_t seq_length = max_seq_length_;
                file.write(reinterpret_cast<char*>(&num_samples), sizeof(uint32_t));
                file.write(reinterpret_cast<char*>(&seq_length), sizeof(uint32_t));

                // Write data
                for (const auto& seq : shard_data) {
                    file.write(reinterpret_cast<const char*>(seq.data()), seq.size() * sizeof(int64_t));
                }

            } else {
                std::cerr << "Unsupported output format: " << output_format_ << std::endl;
                return false;
            }

            return true;

        } catch (const std::exception& e) {
            std::cerr << "Error saving shard: " << e.what() << std::endl;
            return false;
        }
    }

    // Get dataset statistics
    std::unordered_map<std::string, size_t> get_statistics() {
        size_t total_sequences = tokenized_data_.size();
        size_t total_tokens = 0;
        size_t max_length = 0;
        size_t min_length = SIZE_MAX;
        size_t avg_length = 0;

        for (const auto& seq : tokenized_data_) {
            size_t seq_len = seq.size();
            total_tokens += seq_len;
            max_length = std::max(max_length, seq_len);
            min_length = std::min(min_length, seq_len);
        }

        if (total_sequences > 0) {
            avg_length = total_tokens / total_sequences;
        }

        return {
            {"total_samples", total_sequences},
            {"total_tokens", total_tokens},
            {"avg_seq_length", avg_length},
            {"max_seq_length", max_length},
            {"min_seq_length", min_length},
            {"vocab_size", static_cast<size_t>(vocab_size_)}
        };
    }

    // Get processing metrics
    std::unordered_map<std::string, double> get_processing_metrics() {
        auto elapsed = std::chrono::steady_clock::now() - start_time_;
        double elapsed_seconds = std::chrono::duration<double>(elapsed).count();

        return {
            {"processing_time_seconds", elapsed_seconds},
            {"samples_per_second", total_samples_processed_ / elapsed_seconds},
            {"tokens_per_second", total_tokens_ / elapsed_seconds}
        };
    }

    // Full pipeline execution
    bool process_dataset(const std::string& input_json, const std::string& output_dir) {
        std::cout << "=== Phase AST Dataset Ingestion Pipeline ===" << std::endl;

        // Step 1: Load JSON dataset
        if (!load_json_dataset(input_json)) {
            return false;
        }

        // Step 2: Parallel tokenization
        tokenize_dataset_parallel();

        // Step 3: Shuffle if requested
        shuffle_dataset();

        // Step 4: Create train/val split
        auto [train_data, val_data] = create_train_val_split();

        // Step 5: Shard and save training data
        tokenized_data_ = std::move(train_data);
        if (!shard_and_save(output_dir + "/train")) {
            return false;
        }

        // Step 6: Shard and save validation data
        tokenized_data_ = std::move(val_data);
        if (!shard_and_save(output_dir + "/val")) {
            return false;
        }

        // Print statistics
        auto stats = get_statistics();
        auto metrics = get_processing_metrics();

        std::cout << "\n=== Processing Complete ===" << std::endl;
        std::cout << "Total samples: " << stats["total_samples"] << std::endl;
        std::cout << "Total tokens: " << stats["total_tokens"] << std::endl;
        std::cout << "Avg sequence length: " << stats["avg_seq_length"] << std::endl;
        std::cout << "Processing time: " << metrics["processing_time_seconds"] << "s" << std::endl;
        std::cout << "Samples/sec: " << metrics["samples_per_second"] << std::endl;
        std::cout << "Tokens/sec: " << metrics["tokens_per_second"] << std::endl;

        return true;
    }
};

// gRPC service implementation for dataset ingestion
class DatasetIngestionService final : public legal_ai::qlora::QLoRATrainer::Service {
public:
    grpc::Status ProcessDataset(
        grpc::ServerContext* context,
        const legal_ai::qlora::DatasetIngestionRequest* request,
        legal_ai::qlora::DatasetIngestionResponse* response) override {

        try {
            DatasetIngestionPipeline pipeline(
                request->config().tokenizer_name(),
                request->config().max_seq_length(),
                8, // num_shards
                "pt" // output_format
            );

            bool success = pipeline.process_dataset(
                request->dataset_path(),
                request->output_path()
            );

            if (success) {
                response->set_success(true);
                response->set_message("Dataset processing completed successfully");

                // Fill response with statistics
                auto stats = pipeline.get_statistics();
                auto* response_stats = response->mutable_stats();
                response_stats->set_total_samples(stats["total_samples"]);
                response_stats->set_avg_seq_length(stats["avg_seq_length"]);
                response_stats->set_max_seq_length(stats["max_seq_length"]);
                response_stats->set_vocab_size(stats["vocab_size"]);

                // Add token counts (simplified)
                (*response_stats->mutable_token_counts())["total"] = stats["total_tokens"];

            } else {
                response->set_success(false);
                response->set_message("Dataset processing failed");
            }

        } catch (const std::exception& e) {
            response->set_success(false);
            response->set_message(std::string("Error: ") + e.what());
        }

        return grpc::Status::OK;
    }
};

// Main function for dataset ingestion service
int main(int argc, char* argv[]) {
    if (argc < 3) {
        std::cerr << "Usage: " << argv[0] << " <input_json> <output_dir>" << std::endl;
        std::cerr << "Or run as gRPC service: " << argv[0] << " --grpc <port>" << std::endl;
        return 1;
    }

    std::string mode = argv[1];

    if (mode == "--grpc") {
        // Run as gRPC service
        int port = std::stoi(argv[2]);

        std::string server_address = "0.0.0.0:" + std::to_string(port);
        DatasetIngestionService service;

        grpc::ServerBuilder builder;
        builder.AddListeningPort(server_address, grpc::InsecureServerCredentials());
        builder.RegisterService(&service);

        std::unique_ptr<grpc::Server> server(builder.BuildAndStart());
        std::cout << "Phase AST Dataset Ingestion gRPC service listening on " << server_address << std::endl;

        server->Wait();

    } else {
        // Run as command-line tool
        std::string input_json = argv[1];
        std::string output_dir = argv[2];

        DatasetIngestionPipeline pipeline;
        bool success = pipeline.process_dataset(input_json, output_dir);

        return success ? 0 : 1;
    }

    return 0;
}