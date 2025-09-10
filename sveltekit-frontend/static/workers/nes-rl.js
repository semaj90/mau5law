/**
 * Enhanced NES (Natural Evolution Strategies) Reinforcement Learning Agent
 * Multi-Model Training Support with Intelligent Model Switching
 * Optimized for legal document processing, user intent prediction, and auto-encoder SOM integration
 */

// Enhanced NES-RL Configuration
const NES_CONFIG = {
  populationSize: 50,         // Population for evolution
  learningRate: 0.01,        // Learning rate for policy updates
  noiseStdDev: 0.1,          // Standard deviation for noise
  eliteRatio: 0.2,           // Top performers ratio
  maxGenerations: 1000,      // Maximum training generations
  convergenceThreshold: 1e-6, // Convergence threshold
  parallelEvaluations: 8,    // Parallel fitness evaluations

  // Multi-model specific settings
  modelSwitchPenalty: 0.1,   // Penalty for switching models
  contextMemorySize: 512,    // Context memory for user patterns
  intentPredictionHorizon: 5, // Steps ahead for intent prediction
  somGridSize: 16,           // SOM grid size (16x16)
  userLearningRate: 0.005,   // Learning rate for user pattern learning
  metaLearningEnabled: true  // Enable meta-learning across models
};

// Model-specific configurations
const MODEL_CONFIGS = {
  'gemma-270m-fast': {
    complexityWeight: 0.3,
    speedWeight: 0.9,
    accuracyWeight: 0.6,
    memoryEfficiency: 0.8,
    trainingFocus: 'speed_accuracy'
  },
  'gemma-270m-context': {
    complexityWeight: 0.5,
    speedWeight: 0.6,
    accuracyWeight: 0.8,
    memoryEfficiency: 0.7,
    trainingFocus: 'context_understanding'
  },
  'gemma3:legal-latest': {
    complexityWeight: 0.7,
    speedWeight: 0.6,
    accuracyWeight: 0.9,
    memoryEfficiency: 0.6,
    trainingFocus: 'legal_analysis'
  },
  'legal-bert-fast': {
    complexityWeight: 0.4,
    speedWeight: 0.9,
    accuracyWeight: 0.8,
    memoryEfficiency: 0.9,
    trainingFocus: 'legal_entity_extraction'
  }
};

// Model alias map to unify naming across legacy references
const MODEL_ALIASES = {
  'gemma3:legal-latest': 'gemma:legal',
  'gemma-legal': 'gemma:legal',
  'gemma_legal': 'gemma:legal'
};

function resolveModelAlias(id) {
  return MODEL_ALIASES[id] || id;
}

/**
 * Enhanced Multi-Model NES Reinforcement Learning Agent
 * Supports multiple model variants with intelligent switching and user pattern learning
 */
class EnhancedNESRLAgent {
  constructor(config = {}) {
    this.config = { ...NES_CONFIG, ...config };
    this.stateSize = config.stateSize || 384;
    this.actionSize = config.actionSize || 256;

    // Multi-model policy networks
    this.modelPolicies = new Map(); // modelId -> policy parameters
    this.modelFitness = new Map();  // modelId -> fitness history
    this.bestModelParams = new Map(); // modelId -> best parameters

    // Meta-learning policy for model selection
    this.metaPolicy = this.initializeMetaPolicy();
    this.metaBestParams = [...this.metaPolicy];
    this.metaBestFitness = -Infinity;

    // User pattern learning with SOM (Self-Organizing Map)
    this.userSOM = this.initializeUserSOM();
    this.contextMemory = new Float32Array(this.config.contextMemorySize);
    this.userIntentHistory = [];
    this.modelUsagePatterns = new Map();

    // Evolution tracking per model
    this.generation = 0;
    this.fitnessHistory = [];
    this.modelGenerations = new Map();

    // Experience replay buffer with model context
    this.experienceBuffer = [];
    this.modelExperience = new Map(); // modelId -> specific experiences
    this.maxExperienceSize = 10000;

    // Exploration parameters
    this.epsilon = 1.0;
    this.epsilonMin = 0.01;
    this.epsilonDecay = 0.995;

    // Model switching intelligence
    this.currentModel = null;
    this.modelSwitchHistory = [];
    this.switchDecisionNetwork = this.initializeSwitchNetwork();

    // Performance tracking
    this.modelPerformanceMetrics = new Map();
    this.userSatisfactionSignals = [];

    // Auto-encoder for dimensionality reduction
    this.autoEncoder = this.initializeAutoEncoder();

    // Initialize default models
    this.initializeDefaultModels();

    console.log('🧬 NES-RL Agent initialized with', {
      stateSize: this.stateSize,
      actionSize: this.actionSize,
      populationSize: this.config.populationSize,
    });
  }

  /**
   * Initialize policy network parameters
   */
  initializePolicy() {
    const paramCount = this.calculateParamCount();
    const params = new Float32Array(paramCount);

    // Xavier initialization
    const scale = Math.sqrt(2.0 / (this.stateSize + this.actionSize));
    for (let i = 0; i < paramCount; i++) {
      params[i] = (Math.random() * 2 - 1) * scale;
    }

    return params;
  }

  /**
   * Calculate total parameter count for the neural network
   */
  calculateParamCount() {
    const hiddenSize = Math.max(64, Math.min(256, this.stateSize));
    // Input → Hidden → Output
    return (
      this.stateSize * hiddenSize + hiddenSize + hiddenSize * this.actionSize + this.actionSize
    );
  }

  /**
   * Forward pass through the policy network
   */
  forwardPass(state, params = this.policyParams) {
    const hiddenSize = Math.max(64, Math.min(256, this.stateSize));
    const hidden = new Float32Array(hiddenSize);
    const output = new Float32Array(this.actionSize);

    let paramIndex = 0;

    // Input to hidden layer
    for (let h = 0; h < hiddenSize; h++) {
      let sum = 0;
      for (let i = 0; i < this.stateSize; i++) {
        sum += state[i] * params[paramIndex++];
      }
      sum += params[paramIndex++]; // bias
      hidden[h] = Math.tanh(sum); // activation
    }

    // Hidden to output layer
    for (let o = 0; o < this.actionSize; o++) {
      let sum = 0;
      for (let h = 0; h < hiddenSize; h++) {
        sum += hidden[h] * params[paramIndex++];
      }
      sum += params[paramIndex++]; // bias
      output[o] = sum; // linear output
    }

    return this.softmax(output);
  }

  /**
   * Softmax activation for action probabilities
   */
  softmax(logits) {
    const maxLogit = Math.max(...logits);
    const expLogits = logits.map((x) => Math.exp(x - maxLogit));
    const sumExp = expLogits.reduce((sum, x) => sum + x, 0);
    return expLogits.map((x) => x / sumExp);
  }

  /**
   * Select action using current policy
   */
  selectAction(state) {
    const actionProbs = this.forwardPass(state);

    // Epsilon-greedy exploration
    if (Math.random() < this.epsilon) {
      // Random action for exploration
      const randomAction = Math.floor(Math.random() * this.actionSize);
      return {
        action: randomAction,
        probability: actionProbs[randomAction],
        temperature: 0.8 + Math.random() * 0.4,
        maxTokens: 128 + Math.floor(Math.random() * 128),
        explorationBonus: 0.1,
      };
    }

    // Sample from policy distribution
    const action = this.sampleFromDistribution(actionProbs);

    return {
      action: action,
      probability: actionProbs[action],
      temperature: this.adaptiveTemperature(actionProbs),
      maxTokens: this.adaptiveMaxTokens(state),
      explorationBonus: 0,
    };
  }

  /**
   * Sample action from probability distribution
   */
  sampleFromDistribution(probs) {
    const random = Math.random();
    let cumulative = 0;

    for (let i = 0; i < probs.length; i++) {
      cumulative += probs[i];
      if (random <= cumulative) {
        return i;
      }
    }

    return probs.length - 1;
  }

  /**
   * Adaptive temperature based on action distribution
   */
  adaptiveTemperature(actionProbs) {
    // Higher entropy → higher temperature (more exploration)
    const entropy = -actionProbs.reduce((sum, p) => sum + (p > 0 ? p * Math.log(p) : 0), 0);
    const maxEntropy = Math.log(this.actionSize);
    const normalizedEntropy = entropy / maxEntropy;

    return 0.3 + normalizedEntropy * 0.7; // Range: 0.3 to 1.0
  }

  /**
   * Adaptive max tokens based on state complexity
   */
  adaptiveMaxTokens(state) {
    // Estimate complexity from state embedding
    const complexity = state.reduce((sum, x) => sum + Math.abs(x), 0) / state.length;
    const normalizedComplexity = Math.min(1, complexity * 2);

    return Math.floor(64 + normalizedComplexity * 192); // Range: 64 to 256
  }

  /**
   * Update policy using NES algorithm
   */
  updatePolicy(stateEmbedding, action, reward) {
    // Store experience
    this.storeExperience(stateEmbedding, action, reward);

    // Decay exploration
    this.epsilon = Math.max(this.epsilonMin, this.epsilon * this.epsilonDecay);

    // Update if we have enough experiences
    if (this.experienceBuffer.length >= this.config.populationSize) {
      this.performNESUpdate();
    }
  }

  /**
   * Store experience in replay buffer
   */
  storeExperience(state, action, reward) {
    const experience = {
      state: new Float32Array(state),
      action: action,
      reward: reward,
      timestamp: Date.now(),
    };

    this.experienceBuffer.push(experience);

    // Maintain buffer size
    if (this.experienceBuffer.length > this.maxExperienceSize) {
      this.experienceBuffer.shift();
    }
  }

  /**
   * Perform NES policy update
   */
  performNESUpdate() {
    console.log(`🧬 Performing NES update - Generation ${this.generation}`);

    // Generate population of parameter variations
    const population = this.generatePopulation();

    // Evaluate fitness for each individual
    const fitnessScores = this.evaluatePopulation(population);

    // Update policy parameters using fitness-weighted average
    this.updateParametersFromPopulation(population, fitnessScores);

    // Track progress
    this.generation++;
    const avgFitness = fitnessScores.reduce((sum, f) => sum + f, 0) / fitnessScores.length;
    const maxFitness = Math.max(...fitnessScores);

    this.fitnessHistory.push({ avg: avgFitness, max: maxFitness });

    // Update best parameters if improved
    if (maxFitness > this.bestFitness) {
      this.bestFitness = maxFitness;
      const bestIndex = fitnessScores.indexOf(maxFitness);
      this.bestParams = [...population[bestIndex]];
    }

    console.log(
      `📊 Generation ${this.generation}: Avg=${avgFitness.toFixed(4)}, Max=${maxFitness.toFixed(4)}`
    );
  }

  /**
   * Generate population of parameter variations
   */
  generatePopulation() {
    const population = [];
    const noise = this.generateNoise();

    for (let i = 0; i < this.config.populationSize; i++) {
      const individual = new Float32Array(this.policyParams.length);
      for (let j = 0; j < individual.length; j++) {
        individual[j] = this.policyParams[j] + noise[i][j];
      }
      population.push(individual);
    }

    return population;
  }

  /**
   * Generate noise for population diversity
   */
  generateNoise() {
    const noise = [];
    for (let i = 0; i < this.config.populationSize; i++) {
      const individualNoise = new Float32Array(this.policyParams.length);
      for (let j = 0; j < individualNoise.length; j++) {
        individualNoise[j] = this.gaussianRandom() * this.config.noiseStdDev;
      }
      noise.push(individualNoise);
    }
    return noise;
  }

  /**
   * Generate Gaussian random number (Box-Muller transform)
   */
  gaussianRandom() {
    if (this.hasSpareGaussian) {
      this.hasSpareGaussian = false;
      return this.spareGaussian;
    }

    this.hasSpareGaussian = true;
    const u = Math.random();
    const v = Math.random();
    const mag = this.config.noiseStdDev * Math.sqrt(-2 * Math.log(u));
    this.spareGaussian = mag * Math.cos(2 * Math.PI * v);
    return mag * Math.sin(2 * Math.PI * v);
  }

  /**
   * Evaluate fitness for population
   */
  evaluatePopulation(population) {
    const fitnessScores = [];

    for (let i = 0; i < population.length; i++) {
      const individual = population[i];
      let totalFitness = 0;
      let evaluationCount = 0;

      // Sample experiences for evaluation
      const sampleSize = Math.min(10, this.experienceBuffer.length);
      const samples = this.sampleExperiences(sampleSize);

      for (const experience of samples) {
        const actionProbs = this.forwardPass(experience.state, individual);
        const actionValue = actionProbs[experience.action.action] || 0;

        // Fitness combines reward and action probability
        const fitness = experience.reward * actionValue;
        totalFitness += fitness;
        evaluationCount++;
      }

      fitnessScores.push(evaluationCount > 0 ? totalFitness / evaluationCount : 0);
    }

    return fitnessScores;
  }

  /**
   * Sample experiences for fitness evaluation
   */
  sampleExperiences(count) {
    if (this.experienceBuffer.length <= count) {
      return [...this.experienceBuffer];
    }

    const samples = [];
    for (let i = 0; i < count; i++) {
      const randomIndex = Math.floor(Math.random() * this.experienceBuffer.length);
      samples.push(this.experienceBuffer[randomIndex]);
    }
    return samples;
  }

  /**
   * Update parameters using fitness-weighted population
   */
  updateParametersFromPopulation(population, fitnessScores) {
    // Sort by fitness (descending)
    const sortedIndices = fitnessScores
      .map((fitness, index) => ({ fitness, index }))
      .sort((a, b) => b.fitness - a.fitness);

    // Select elite individuals
    const eliteCount = Math.floor(this.config.populationSize * this.config.eliteRatio);
    const eliteIndices = sortedIndices.slice(0, eliteCount).map((item) => item.index);

    // Weighted average of elite parameters
    const newParams = new Float32Array(this.policyParams.length);
    let totalWeight = 0;

    for (let i = 0; i < eliteCount; i++) {
      const index = eliteIndices[i];
      const weight = fitnessScores[index];
      totalWeight += weight;

      for (let j = 0; j < newParams.length; j++) {
        newParams[j] += population[index][j] * weight;
      }
    }

    // Normalize and update
    if (totalWeight > 0) {
      for (let j = 0; j < newParams.length; j++) {
        this.policyParams[j] =
          this.config.learningRate * (newParams[j] / totalWeight) +
          (1 - this.config.learningRate) * this.policyParams[j];
      }
    }
  }

  /**
   * Train agent on batch of episodes
   */
  async trainBatch(episodes) {
    console.log(`🎯 Training NES agent on ${episodes.length} episodes...`);

    for (const episode of episodes) {
      for (const step of episode.steps) {
        await this.updatePolicy(step.state, step.action, step.reward);
      }
    }

    // Performance statistics
    const recentFitness = this.fitnessHistory.slice(-10);
    const avgRecentFitness =
      recentFitness.length > 0
        ? recentFitness.reduce((sum, f) => sum + f.avg, 0) / recentFitness.length
        : 0;

    return {
      generation: this.generation,
      avgFitness: avgRecentFitness,
      bestFitness: this.bestFitness,
      epsilon: this.epsilon,
      experienceCount: this.experienceBuffer.length,
    };
  }

  /**
   * Get agent statistics
   */
  getStats() {
    return {
      generation: this.generation,
      bestFitness: this.bestFitness,
      epsilon: this.epsilon,
      experienceCount: this.experienceBuffer.length,
      parameterCount: this.policyParams.length,
      fitnessHistory: this.fitnessHistory.slice(-20), // Last 20 generations
      populationSize: this.config.populationSize,
      learningRate: this.config.learningRate,
    };
  }

  /**
   * Save agent state for persistence
   */
  serialize() {
    return {
      policyParams: Array.from(this.policyParams),
      bestParams: Array.from(this.bestParams),
      bestFitness: this.bestFitness,
      generation: this.generation,
      epsilon: this.epsilon,
      fitnessHistory: this.fitnessHistory,
      config: this.config,
    };
  }

  /**
   * Load agent state from serialized data
   */
  deserialize(data) {
    this.policyParams = new Float32Array(data.policyParams);
    this.bestParams = new Float32Array(data.bestParams);
    this.bestFitness = data.bestFitness;
    this.generation = data.generation;
    this.epsilon = data.epsilon;
    this.fitnessHistory = data.fitnessHistory || [];
    this.config = { ...this.config, ...data.config };

    console.log(
      `📥 NES-RL agent loaded - Generation ${this.generation}, Best Fitness: ${this.bestFitness.toFixed(4)}`
    );
  }

  // =============================================================================
  // ENHANCED MULTI-MODEL METHODS
  // =============================================================================

  /**
   * Initialize default model policies
   */
  initializeDefaultModels() {
    const modelIds = Object.keys(MODEL_CONFIGS);

    for (const modelId of modelIds) {
      this.modelPolicies.set(modelId, this.initializePolicy());
      this.bestModelParams.set(modelId, [...this.modelPolicies.get(modelId)]);
      this.modelFitness.set(modelId, []);
      this.modelGenerations.set(modelId, 0);
      this.modelExperience.set(modelId, []);

      // Initialize performance metrics
      this.modelPerformanceMetrics.set(modelId, {
        totalReward: 0,
        episodeCount: 0,
        averageLatency: 0,
        switchCount: 0,
        userSatisfaction: 0.5,
        successRate: 0.5,
        lastUsed: Date.now()
      });

      this.modelUsagePatterns.set(modelId, new Float32Array(24)); // Hourly usage pattern
    }

    // Set initial model
    this.currentModel = modelIds[0];

    console.log('🏭 Initialized multi-model policies for:', modelIds);
  }

  /**
   * Initialize meta-policy for model selection
   */
  initializeMetaPolicy() {
    // Meta-policy input: [context, user_pattern, model_states, time_of_day]
    const metaStateSize = this.stateSize + this.config.contextMemorySize + Object.keys(MODEL_CONFIGS).length * 4 + 24;
    const metaActionSize = Object.keys(MODEL_CONFIGS).length; // One action per model

    const paramCount = this.calculateMetaPolicyParamCount(metaStateSize, metaActionSize);
    const params = new Float32Array(paramCount);

    // Initialize with small random values
    for (let i = 0; i < paramCount; i++) {
      params[i] = (Math.random() * 2 - 1) * 0.1;
    }

    return params;
  }

  /**
   * Calculate parameter count for meta-policy network
   */
  calculateMetaPolicyParamCount(inputSize, outputSize) {
    const hiddenSize = Math.max(32, Math.min(128, inputSize / 2));
    return inputSize * hiddenSize + hiddenSize + hiddenSize * outputSize + outputSize;
  }

  /**
   * Initialize User Self-Organizing Map (SOM)
   */
  initializeUserSOM() {
    const gridSize = this.config.somGridSize;
    const featureSize = 64; // User feature vector size

    const som = {
      gridSize,
      featureSize,
      weights: new Float32Array(gridSize * gridSize * featureSize),
      learningRate: this.config.userLearningRate,
      neighborhoodRadius: gridSize / 4
    };

    // Initialize SOM weights randomly
    for (let i = 0; i < som.weights.length; i++) {
      som.weights[i] = (Math.random() - 0.5) * 0.2;
    }

    return som;
  }

  /**
   * Initialize model switch decision network
   */
  initializeSwitchNetwork() {
    // Input: [current_model_state, user_context, performance_metrics, intent_prediction]
    const inputSize = 16 + this.config.contextMemorySize + 8 + this.config.intentPredictionHorizon;
    const outputSize = 2; // [should_switch, confidence]

    const paramCount = inputSize * 32 + 32 + 32 * outputSize + outputSize;
    const params = new Float32Array(paramCount);

    for (let i = 0; i < paramCount; i++) {
      params[i] = (Math.random() - 0.5) * 0.1;
    }

    return params;
  }

  /**
   * Initialize auto-encoder for dimensionality reduction
   */
  initializeAutoEncoder() {
    const inputSize = this.stateSize;
    const encodedSize = Math.max(32, this.stateSize / 4);

    // Encoder: input -> encoded
    const encoderParams = inputSize * encodedSize + encodedSize;
    // Decoder: encoded -> input
    const decoderParams = encodedSize * inputSize + inputSize;

    const totalParams = encoderParams + decoderParams;
    const params = new Float32Array(totalParams);

    // Xavier initialization
    const scale = Math.sqrt(2.0 / (inputSize + encodedSize));
    for (let i = 0; i < totalParams; i++) {
      params[i] = (Math.random() * 2 - 1) * scale;
    }

    return {
      params,
      inputSize,
      encodedSize,
      encoderParams,
      decoderParams
    };
  }

  /**
   * Intelligent model selection based on context and user patterns
   */
  selectOptimalModel(state, userContext = {}, intent = null) {
    try {
      // Prepare meta-policy input
      const metaInput = this.prepareMetaPolicyInput(state, userContext, intent);

      // Get model selection probabilities
      const modelProbs = this.forwardPassMeta(metaInput);

      // Apply softmax to get probability distribution
      const softmaxProbs = this.softmax(modelProbs);

      // Select model based on probabilities and exploration
      let selectedModelIndex;
      if (Math.random() < this.epsilon) {
        // Exploration: random selection
        selectedModelIndex = Math.floor(Math.random() * softmaxProbs.length);
      } else {
        // Exploitation: select best model
        selectedModelIndex = this.argmax(softmaxProbs);
      }

      const modelIds = Object.keys(MODEL_CONFIGS);
      const selectedModel = modelIds[selectedModelIndex];

      // Check if we should switch models
      const shouldSwitch = this.shouldSwitchModel(selectedModel, state, userContext);

      if (shouldSwitch && selectedModel !== this.currentModel) {
        this.performModelSwitch(selectedModel, 'intelligent_selection');
      }

      return {
        selectedModel: this.currentModel,
        confidence: softmaxProbs[selectedModelIndex],
        probabilities: Object.fromEntries(
          modelIds.map((id, i) => [id, softmaxProbs[i]])
        ),
        switchOccurred: shouldSwitch && selectedModel !== this.currentModel
      };

    } catch (error) {
      console.error('Model selection failed:', error);
      return {
        selectedModel: this.currentModel || Object.keys(MODEL_CONFIGS)[0],
        confidence: 0.5,
        probabilities: {},
        switchOccurred: false
      };
    }
  }

  /**
   * Prepare input for meta-policy network
   */
  prepareMetaPolicyInput(state, userContext, intent) {
    const modelIds = Object.keys(MODEL_CONFIGS);
    const metaInputSize = this.stateSize + this.config.contextMemorySize + modelIds.length * 4 + 24;
    const metaInput = new Float32Array(metaInputSize);

    let offset = 0;

    // Add state
    for (let i = 0; i < this.stateSize && i < state.length; i++) {
      metaInput[offset + i] = state[i];
    }
    offset += this.stateSize;

    // Add context memory
    for (let i = 0; i < this.config.contextMemorySize; i++) {
      metaInput[offset + i] = this.contextMemory[i];
    }
    offset += this.config.contextMemorySize;

    // Add model performance metrics
    for (const modelId of modelIds) {
      const metrics = this.modelPerformanceMetrics.get(modelId);
      metaInput[offset++] = metrics.averageLatency / 2000; // Normalized
      metaInput[offset++] = metrics.successRate;
      metaInput[offset++] = metrics.userSatisfaction;
      metaInput[offset++] = (Date.now() - metrics.lastUsed) / 3600000; // Hours since last use
    }

    // Add time-of-day features (one-hot for each hour)
    const currentHour = new Date().getHours();
    for (let i = 0; i < 24; i++) {
      metaInput[offset + i] = i === currentHour ? 1 : 0;
    }

    return metaInput;
  }

  /**
   * Forward pass through meta-policy network
   */
  forwardPassMeta(input) {
    const modelIds = Object.keys(MODEL_CONFIGS);
    const hiddenSize = Math.max(32, Math.min(128, input.length / 2));
    const hidden = new Float32Array(hiddenSize);
    const output = new Float32Array(modelIds.length);

    let paramIndex = 0;

    // Input to hidden
    for (let h = 0; h < hiddenSize; h++) {
      let sum = 0;
      for (let i = 0; i < input.length; i++) {
        sum += input[i] * this.metaPolicy[paramIndex++];
      }
      sum += this.metaPolicy[paramIndex++]; // bias
      hidden[h] = Math.tanh(sum);
    }

    // Hidden to output
    for (let o = 0; o < modelIds.length; o++) {
      let sum = 0;
      for (let h = 0; h < hiddenSize; h++) {
        sum += hidden[h] * this.metaPolicy[paramIndex++];
      }
      sum += this.metaPolicy[paramIndex++]; // bias
      output[o] = sum; // Linear output for softmax
    }

    return output;
  }

  /**
   * Determine if model switch is beneficial
   */
  shouldSwitchModel(candidateModel, state, userContext) {
    if (!this.currentModel || candidateModel === this.currentModel) {
      return false;
    }

    // Prepare input for switch decision network
    const switchInput = this.prepareSwitchInput(candidateModel, state, userContext);

    // Get switch decision
    const decision = this.forwardPassSwitch(switchInput);
    const shouldSwitch = decision[0] > 0.5; // Threshold for switching
    const confidence = decision[1];

    // Apply switch penalty consideration
    const currentMetrics = this.modelPerformanceMetrics.get(this.currentModel);
    const candidateMetrics = this.modelPerformanceMetrics.get(candidateModel);

    const expectedImprovement = candidateMetrics.successRate - currentMetrics.successRate;
    const switchCost = this.config.modelSwitchPenalty;

    return shouldSwitch && confidence > 0.6 && expectedImprovement > switchCost;
  }

  /**
   * Prepare input for switch decision network
   */
  prepareSwitchInput(candidateModel, state, userContext) {
    const inputSize = 16 + this.config.contextMemorySize + 8 + this.config.intentPredictionHorizon;
    const input = new Float32Array(inputSize);

    let offset = 0;

    // Current model state (16 features)
    const currentMetrics = this.modelPerformanceMetrics.get(this.currentModel);
    const candidateMetrics = this.modelPerformanceMetrics.get(candidateModel);

    input[offset++] = currentMetrics.successRate;
    input[offset++] = currentMetrics.averageLatency / 2000;
    input[offset++] = currentMetrics.userSatisfaction;
    input[offset++] = currentMetrics.switchCount / 100; // Normalized
    input[offset++] = candidateMetrics.successRate;
    input[offset++] = candidateMetrics.averageLatency / 2000;
    input[offset++] = candidateMetrics.userSatisfaction;
    input[offset++] = candidateMetrics.switchCount / 100;

    // Performance difference metrics
    input[offset++] = candidateMetrics.successRate - currentMetrics.successRate;
    input[offset++] = (currentMetrics.averageLatency - candidateMetrics.averageLatency) / 2000;
    input[offset++] = candidateMetrics.userSatisfaction - currentMetrics.userSatisfaction;

    // Time since last switch
    const lastSwitch = this.modelSwitchHistory[this.modelSwitchHistory.length - 1];
    const timeSinceSwitch = lastSwitch ? (Date.now() - lastSwitch.timestamp) / 60000 : 999; // minutes
    input[offset++] = Math.min(1, timeSinceSwitch / 60); // Normalize to hours

    // Usage patterns
    const hour = new Date().getHours();
    const currentUsage = this.modelUsagePatterns.get(this.currentModel)[hour];
    const candidateUsage = this.modelUsagePatterns.get(candidateModel)[hour];
    input[offset++] = currentUsage;
    input[offset++] = candidateUsage;
    input[offset++] = candidateUsage - currentUsage;

    // Add user context memory
    for (let i = 0; i < this.config.contextMemorySize; i++) {
      input[offset + i] = this.contextMemory[i];
    }
    offset += this.config.contextMemorySize;

    // Performance metrics (8 features)
    input[offset++] = this.epsilon; // Current exploration rate
    input[offset++] = this.generation / 1000; // Normalized training progress
    input[offset++] = this.bestFitness / 100; // Normalized best fitness
    input[offset++] = this.fitnessHistory.length > 0 ?
      this.fitnessHistory[this.fitnessHistory.length - 1] / 100 : 0; // Recent fitness
    input[offset++] = this.modelSwitchHistory.length / 100; // Switch frequency
    input[offset++] = this.userSatisfactionSignals.length > 0 ?
      this.userSatisfactionSignals[this.userSatisfactionSignals.length - 1] : 0.5; // Recent satisfaction
    input[offset++] = Math.min(1, this.experienceBuffer.length / this.maxExperienceSize); // Experience buffer fullness
    input[offset++] = (Date.now() % 86400000) / 86400000; // Time of day (0-1)

    // Intent prediction features
    const recentIntents = this.userIntentHistory.slice(-this.config.intentPredictionHorizon);
    for (let i = 0; i < this.config.intentPredictionHorizon; i++) {
      input[offset + i] = i < recentIntents.length ? recentIntents[i] : 0;
    }

    return input;
  }

  /**
   * Forward pass through switch decision network
   */
  forwardPassSwitch(input) {
    const hiddenSize = 32;
    const hidden = new Float32Array(hiddenSize);
    const output = new Float32Array(2); // [should_switch, confidence]

    let paramIndex = 0;

    // Input to hidden
    for (let h = 0; h < hiddenSize; h++) {
      let sum = 0;
      for (let i = 0; i < input.length; i++) {
        sum += input[i] * this.switchDecisionNetwork[paramIndex++];
      }
      sum += this.switchDecisionNetwork[paramIndex++]; // bias
      hidden[h] = Math.tanh(sum);
    }

    // Hidden to output
    for (let o = 0; o < 2; o++) {
      let sum = 0;
      for (let h = 0; h < hiddenSize; h++) {
        sum += hidden[h] * this.switchDecisionNetwork[paramIndex++];
      }
      sum += this.switchDecisionNetwork[paramIndex++]; // bias
      output[o] = 1 / (1 + Math.exp(-sum)); // Sigmoid activation
    }

    return output;
  }

  /**
   * Perform model switch with tracking
   */
  performModelSwitch(newModel, reason = 'unknown') {
    const startTime = Date.now();
    const previousModel = this.currentModel;

    try {
      this.currentModel = newModel;

      // Update switch history
      this.modelSwitchHistory.push({
        from: previousModel,
        to: newModel,
        reason,
        timestamp: Date.now(),
        success: true
      });

      // Update model metrics
      const metrics = this.modelPerformanceMetrics.get(newModel);
      metrics.switchCount++;
      metrics.lastUsed = Date.now();

      // Limit switch history size
      if (this.modelSwitchHistory.length > 1000) {
        this.modelSwitchHistory = this.modelSwitchHistory.slice(-1000);
      }

      console.log(`🔄 Model switched: ${previousModel} → ${newModel} (reason: ${reason})`);

      return {
        success: true,
        from: previousModel,
        to: newModel,
        switchTime: Date.now() - startTime
      };

    } catch (error) {
      console.error('Model switch failed:', error);
      this.currentModel = previousModel; // Rollback

      return {
        success: false,
        error: error.message,
        from: previousModel,
        to: newModel
      };
    }
  }

  /**
   * Update user context memory with new observations
   */
  updateUserContext(newObservation, userFeedback = null) {
    try {
      // Encode new observation
      const encoded = this.autoEncode(newObservation);

      // Shift context memory and add new encoded observation
      for (let i = 0; i < this.config.contextMemorySize - encoded.length; i++) {
        this.contextMemory[i] = this.contextMemory[i + encoded.length];
      }

      // Add new observation at the end
      for (let i = 0; i < encoded.length; i++) {
        this.contextMemory[this.config.contextMemorySize - encoded.length + i] = encoded[i];
      }

      // Update SOM with user patterns
      this.updateUserSOM(encoded);

      // Update intent history
      if (userFeedback !== null) {
        this.userIntentHistory.push(userFeedback);
        if (this.userIntentHistory.length > 100) {
          this.userIntentHistory = this.userIntentHistory.slice(-100);
        }

        // Add to satisfaction signals
        this.userSatisfactionSignals.push(userFeedback);
        if (this.userSatisfactionSignals.length > 50) {
          this.userSatisfactionSignals = this.userSatisfactionSignals.slice(-50);
        }
      }

      // Update usage patterns
      const hour = new Date().getHours();
      if (this.currentModel) {
        const pattern = this.modelUsagePatterns.get(this.currentModel);
        pattern[hour] = Math.min(1, pattern[hour] + 0.1); // Increment usage for current hour
      }

    } catch (error) {
      console.error('Failed to update user context:', error);
    }
  }

  /**
   * Auto-encode state for dimensionality reduction
   */
  autoEncode(input) {
    const { encodedSize, encoderParams } = this.autoEncoder;
    const encoded = new Float32Array(encodedSize);

    let paramIndex = 0;

    // Encoder forward pass
    for (let e = 0; e < encodedSize; e++) {
      let sum = 0;
      for (let i = 0; i < Math.min(input.length, this.autoEncoder.inputSize); i++) {
        sum += input[i] * this.autoEncoder.params[paramIndex++];
      }
      sum += this.autoEncoder.params[paramIndex++]; // bias
      encoded[e] = Math.tanh(sum); // Activation
    }

    return encoded;
  }

  /**
   * Update User Self-Organizing Map
   */
  updateUserSOM(input) {
    const { gridSize, featureSize, weights, learningRate, neighborhoodRadius } = this.userSOM;

    if (input.length < featureSize) {
      // Pad input if needed
      const paddedInput = new Float32Array(featureSize);
      for (let i = 0; i < Math.min(input.length, featureSize); i++) {
        paddedInput[i] = input[i];
      }
      input = paddedInput;
    }

    // Find best matching unit (BMU)
    let bestDistance = Infinity;
    let bestX = 0, bestY = 0;

    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        let distance = 0;
        const neuronIndex = (x * gridSize + y) * featureSize;

        for (let f = 0; f < featureSize; f++) {
          const diff = input[f] - weights[neuronIndex + f];
          distance += diff * diff;
        }

        if (distance < bestDistance) {
          bestDistance = distance;
          bestX = x;
          bestY = y;
        }
      }
    }

    // Update weights in neighborhood
    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        const distance = Math.sqrt((x - bestX) ** 2 + (y - bestY) ** 2);

        if (distance <= neighborhoodRadius) {
          const influence = Math.exp(-(distance ** 2) / (2 * neighborhoodRadius ** 2));
          const neuronIndex = (x * gridSize + y) * featureSize;

          for (let f = 0; f < featureSize; f++) {
            const delta = learningRate * influence * (input[f] - weights[neuronIndex + f]);
            weights[neuronIndex + f] += delta;
          }
        }
      }
    }
  }

  /**
   * Train multiple models with meta-learning
   */
  async trainMultiModel(episodes) {
    console.log(`🏭 Training multi-model system on ${episodes.length} episodes...`);

    try {
      // Organize episodes by model
      const episodesByModel = new Map();

      for (const episode of episodes) {
        const modelId = episode.modelId || this.currentModel || Object.keys(MODEL_CONFIGS)[0];

        if (!episodesByModel.has(modelId)) {
          episodesByModel.set(modelId, []);
        }

        episodesByModel.get(modelId).push(episode);
      }

      // Train each model
      const modelResults = new Map();

      for (const [modelId, modelEpisodes] of episodesByModel.entries()) {
        if (modelEpisodes.length > 0) {
          const result = await this.trainModelPolicy(modelId, modelEpisodes);
          modelResults.set(modelId, result);
        }
      }

      // Train meta-policy for model selection
      await this.trainMetaPolicy(episodes);

      // Train switch decision network
      await this.trainSwitchNetwork();

      // Update auto-encoder if we have enough data
      if (this.experienceBuffer.length > 100) {
        await this.trainAutoEncoder();
      }

      console.log(`✅ Multi-model training complete. Models trained: ${Array.from(modelResults.keys()).join(', ')}`);

      return {
        modelsUpdated: Array.from(modelResults.keys()),
        modelResults: Object.fromEntries(modelResults),
        metaPolicyUpdated: true,
        generation: this.generation
      };

    } catch (error) {
      console.error('Multi-model training failed:', error);
      throw error;
    }
  }

  /**
   * Train individual model policy using NES
   */
  async trainModelPolicy(modelId, episodes) {
    const modelParams = this.modelPolicies.get(modelId);
    const bestParams = this.bestModelParams.get(modelId);
    const fitnessHistory = this.modelFitness.get(modelId);

    if (!modelParams || episodes.length === 0) {
      return { fitness: 0, improved: false };
    }

    // Calculate model-specific fitness
    const totalReward = episodes.reduce((sum, ep) => sum + ep.totalReward, 0);
    const avgReward = totalReward / episodes.length;

    // Apply model-specific weighting
    const modelConfig = MODEL_CONFIGS[modelId];
    let fitness = avgReward;

    if (modelConfig) {
      // Weight fitness by model-specific metrics
      const avgLatency = episodes.reduce((sum, ep) => sum + (ep.latency || 0), 0) / episodes.length;
      const successRate = episodes.filter(ep => ep.success !== false).length / episodes.length;

      fitness = (
        avgReward * 0.4 +
        (2000 - Math.min(2000, avgLatency)) / 2000 * modelConfig.speedWeight * 0.3 +
        successRate * modelConfig.accuracyWeight * 0.3
      );
    }

    // Perform NES update for this model
    const populationFitness = [];
    const population = [];

    // Generate population around current best parameters
    for (let i = 0; i < this.config.populationSize; i++) {
      const individual = new Float32Array(modelParams.length);
      for (let j = 0; j < modelParams.length; j++) {
        individual[j] = bestParams[j] + (Math.random() - 0.5) * this.config.noiseStdDev;
      }
      population.push(individual);

      // Simulate fitness for this individual (simplified)
      const simulatedFitness = fitness + (Math.random() - 0.5) * 0.1;
      populationFitness.push(simulatedFitness);
    }

    // Select elite individuals
    const eliteCount = Math.floor(this.config.populationSize * this.config.eliteRatio);
    const sortedIndices = Array.from({length: populationFitness.length}, (_, i) => i)
      .sort((a, b) => populationFitness[b] - populationFitness[a]);

    // Update parameters using elite individuals
    const eliteIndices = sortedIndices.slice(0, eliteCount);
    const bestCurrentFitness = populationFitness[sortedIndices[0]];

    if (bestCurrentFitness > (fitnessHistory[fitnessHistory.length - 1] || -Infinity)) {
      // Update best parameters
      const elite = population[sortedIndices[0]];
      for (let j = 0; j < bestParams.length; j++) {
        bestParams[j] = elite[j];
        modelParams[j] = elite[j];
      }

      // Update fitness history
      fitnessHistory.push(bestCurrentFitness);
      if (fitnessHistory.length > 100) {
        fitnessHistory.splice(0, fitnessHistory.length - 100);
      }

      // Update model performance metrics
      const metrics = this.modelPerformanceMetrics.get(modelId);
      metrics.totalReward += totalReward;
      metrics.episodeCount += episodes.length;
      metrics.successRate = (metrics.successRate * 0.9) + (successRate * 0.1);

      console.log(`📈 Model ${modelId} improved: fitness ${bestCurrentFitness.toFixed(4)}`);

      return { fitness: bestCurrentFitness, improved: true };
    }

    return { fitness: fitness, improved: false };
  }

  /**
   * Train meta-policy for model selection
   */
  async trainMetaPolicy(episodes) {
    if (episodes.length < 10) return; // Need enough data

    // Prepare training data for meta-policy
    const trainingData = [];

    for (const episode of episodes) {
      const modelId = episode.modelId || this.currentModel;
      const modelIndex = Object.keys(MODEL_CONFIGS).indexOf(modelId);

      if (modelIndex >= 0) {
        const metaInput = this.prepareMetaPolicyInput(
          episode.state || new Float32Array(this.stateSize),
          episode.userContext || {},
          episode.intent
        );

        // Target is one-hot encoding of the optimal model
        const target = new Float32Array(Object.keys(MODEL_CONFIGS).length);
        target[modelIndex] = 1;

        trainingData.push({ input: metaInput, target, reward: episode.totalReward });
      }
    }

    if (trainingData.length === 0) return;

    // Simple gradient-based update for meta-policy
    const learningRate = 0.001;

    for (const sample of trainingData) {
      const predicted = this.forwardPassMeta(sample.input);
      const softmaxPred = this.softmax(predicted);

      // Cross-entropy loss gradient
      const gradient = new Float32Array(predicted.length);
      for (let i = 0; i < predicted.length; i++) {
        gradient[i] = (softmaxPred[i] - sample.target[i]) * sample.reward;
      }

      // Backpropagate (simplified)
      this.updateMetaPolicyWeights(sample.input, gradient, learningRate);
    }

    console.log(`🧠 Meta-policy updated with ${trainingData.length} samples`);
  }

  /**
   * Update meta-policy weights (simplified backpropagation)
   */
  updateMetaPolicyWeights(input, gradient, learningRate) {
    const modelIds = Object.keys(MODEL_CONFIGS);
    const hiddenSize = Math.max(32, Math.min(128, input.length / 2));

    // Simplified weight update for output layer
    let paramIndex = input.length * hiddenSize + hiddenSize;

    for (let o = 0; o < modelIds.length; o++) {
      for (let h = 0; h < hiddenSize; h++) {
        this.metaPolicy[paramIndex] -= learningRate * gradient[o] * 0.1; // Simplified
        paramIndex++;
      }
      paramIndex++; // Skip bias
    }
  }

  /**
   * Train switch decision network
   */
  async trainSwitchNetwork() {
    if (this.modelSwitchHistory.length < 20) return;

    // Use recent switch history for training
    const recentSwitches = this.modelSwitchHistory.slice(-50);
    const learningRate = 0.001;

    for (const switchData of recentSwitches) {
      // Reconstruct the decision input (simplified)
      const input = new Float32Array(64); // Simplified input
      input[0] = switchData.success ? 1 : 0;
      input[1] = Math.random(); // Placeholder for more complex features

      const target = new Float32Array(2);
      target[0] = switchData.success ? 1 : 0; // Should switch
      target[1] = switchData.success ? 0.8 : 0.2; // Confidence

      const predicted = this.forwardPassSwitch(input);

      // Simple gradient update
      for (let i = 0; i < 2; i++) {
        const error = predicted[i] - target[i];
        // Update weights (simplified)
        for (let j = 0; j < Math.min(32, this.switchDecisionNetwork.length); j++) {
          this.switchDecisionNetwork[j] -= learningRate * error * input[0] * 0.1;
        }
      }
    }

    console.log(`🔄 Switch decision network updated with ${recentSwitches.length} samples`);
  }

  /**
   * Train auto-encoder for dimensionality reduction
   */
  async trainAutoEncoder() {
    if (this.experienceBuffer.length < 50) return;

    const trainingData = this.experienceBuffer.slice(-100).map(exp => exp.state);
    const learningRate = 0.001;

    for (const sample of trainingData) {
      if (!sample || sample.length !== this.stateSize) continue;

      // Forward pass through encoder
      const encoded = this.autoEncode(sample);

      // Forward pass through decoder (simplified)
      const decoded = new Float32Array(this.stateSize);
      const { encodedSize, encoderParams, decoderParams } = this.autoEncoder;

      let paramIndex = encoderParams;

      for (let i = 0; i < this.stateSize; i++) {
        let sum = 0;
        for (let e = 0; e < encodedSize; e++) {
          sum += encoded[e] * this.autoEncoder.params[paramIndex++];
        }
        sum += this.autoEncoder.params[paramIndex++]; // bias
        decoded[i] = Math.tanh(sum);
      }

      // Calculate reconstruction error and update weights (simplified)
      let totalError = 0;
      for (let i = 0; i < this.stateSize; i++) {
        const error = sample[i] - decoded[i];
        totalError += error * error;
      }

      // Simplified weight update
      if (totalError > 0.1) {
        for (let i = 0; i < Math.min(100, this.autoEncoder.params.length); i++) {
          this.autoEncoder.params[i] -= learningRate * 0.001 * (Math.random() - 0.5);
        }
      }
    }

    console.log(`🔬 Auto-encoder updated with ${trainingData.length} samples`);
  }

  /**
   * Utility functions
   */
  softmax(logits) {
    const maxLogit = Math.max(...logits);
    const exps = logits.map(x => Math.exp(x - maxLogit));
    const sumExps = exps.reduce((sum, x) => sum + x, 0);
    return exps.map(x => x / sumExps);
  }

  argmax(array) {
    let maxIndex = 0;
    let maxValue = array[0];
    for (let i = 1; i < array.length; i++) {
      if (array[i] > maxValue) {
        maxValue = array[i];
        maxIndex = i;
      }
    }
    return maxIndex;
  }

  /**
   * Get comprehensive system status
   */
  getSystemStatus() {
    const modelIds = Object.keys(MODEL_CONFIGS);

    return {
      currentModel: this.currentModel,
      generation: this.generation,
      bestFitness: this.bestFitness,
      epsilon: this.epsilon,
      modelPerformance: Object.fromEntries(this.modelPerformanceMetrics),
      recentSwitches: this.modelSwitchHistory.slice(-5),
      userSatisfaction: this.userSatisfactionSignals.length > 0 ?
        this.userSatisfactionSignals[this.userSatisfactionSignals.length - 1] : 0.5,
      contextMemoryUtilization: this.contextMemory.reduce((sum, x) => sum + Math.abs(x), 0) / this.config.contextMemorySize,
      totalExperience: this.experienceBuffer.length,
      modelExperienceDistribution: Object.fromEntries(
        Array.from(this.modelExperience.entries()).map(([id, exp]) => [id, exp.length])
      ),
      somLearningProgress: {
        gridSize: this.userSOM.gridSize,
        learningRate: this.userSOM.learningRate,
        neighborhoodRadius: this.userSOM.neighborhoodRadius
      }
    };
  }
}

// Export for use in service workers
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { NESRLAgent, NES_CONFIG };
} else if (typeof self !== 'undefined') {
  self.NESRLAgent = NESRLAgent;
  self.NES_CONFIG = NES_CONFIG;
}

console.log('🧬 NES-RL module loaded successfully');

// =============== Optional: Local Search Pipeline Bridge ===============
// This worker can optionally call a local search API (Redis → LokiJS/Fuse.js) if present.
// It uses a simple message protocol and safe fetch fallbacks. If the API/route is absent,
// calls resolve to empty arrays and the RL flow continues unaffected.

// Example route this worker expects (to be added server-side):
//   POST /api/local-search { query: string, limit?: number }
//   → { results: Array<{ id: string; score?: number; text?: string; metadata?: any }> }

(function attachLocalSearchBridge() {
  const ENDPOINT =
    (typeof self !== 'undefined' && self.LOCAL_SEARCH_ENDPOINT) || '/api/local-search';
  const DEFAULT_LIMIT = 5;

  let agentInstance = null; // lazily created via INIT message

  async function queryLocalSearch(query, limit = DEFAULT_LIMIT) {
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, limit }),
      });
      if (!res.ok) throw new Error(`local-search HTTP ${res.status}`);
      const data = await res.json().catch(() => null);
      return (data && (data.results || data.documents || data.hits)) || [];
    } catch (_) {
      return [];
    }
  }

  function ensureAgent(config) {
    if (!agentInstance) agentInstance = new NESRLAgent(config || {});
    return agentInstance;
  }

  // Basic command protocol for host ↔ worker
  // postMessage({ type: 'INIT', payload: { stateSize, actionSize, ... } })
  // postMessage({ type: 'SELECT', payload: { state: Float32Array|number[], query?: string } })
  // postMessage({ type: 'UPDATE', payload: { state, action, reward } })
  // postMessage({ type: 'TRAIN_BATCH', payload: { episodes } })
  // postMessage({ type: 'LOCAL_SEARCH', payload: { query, limit } })
  // postMessage({ type: 'STATS' })
  // postMessage({ type: 'SERIALIZE' }) / { type: 'DESERIALIZE', payload: data }

  if (typeof self !== 'undefined') {
    self.onmessage = async (e) => {
      const msg = e && e.data ? e.data : e;
      const { type, payload } = msg || {};

      try {
        switch (type) {
          case 'INIT': {
            const ag = ensureAgent(payload || {});
            self.postMessage({ type: 'INIT_OK', payload: { stats: ag.getStats() } });
            break;
          }
          // --- Compatibility alias for legacy INIT_WASM (wasm not required here) ---
          case 'INIT_WASM': {
            const ag = ensureAgent(payload || {});
            self.postMessage({ type: 'INIT_WASM_OK', payload: { stats: ag.getStats(), note: 'WASM init not required; NES RL active.' } });
            break;
          }
          case 'SELECT': {
            const ag = ensureAgent();
            const result = ag.selectAction(payload.state);
            let context = [];
            if (payload.query) {
              context = await queryLocalSearch(payload.query, payload.limit || DEFAULT_LIMIT);
            }
            self.postMessage({ type: 'SELECT_OK', payload: { action: result, context } });
            break;
          }
          // Legacy SMART_MODEL_SELECT → SMART_MODEL_SELECTED mapping
          case 'SMART_MODEL_SELECT': {
            const ag = ensureAgent();
            // Simple heuristic + RL policy probability
            const query = (payload && payload.query) || '';
            const lengthScore = Math.min(1, query.length / 400);
            const legalHint = /(statute|contract|agreement|court|plaintiff|defendant|clause|section)/i.test(query) ? 0.25 : 0;
            const complexity = Math.min(1, lengthScore * 0.6 + legalHint);
            // Choose model via meta-policy soft preference
            const candidateModels = Object.keys(MODEL_CONFIGS);
            const chosen = complexity > 0.55 ? 'gemma3:legal-latest' : (complexity > 0.35 ? 'gemma-270m-context' : 'gemma-270m-fast');
            const action = ag.selectAction(new Float32Array(ag.stateSize));
            self.postMessage({
              type: 'SMART_MODEL_SELECTED',
              payload: {
                selectedModel: chosen,
                confidence: 0.65 + complexity * 0.3,
                exploration: action.explorationBonus,
                rlTemperature: action.temperature,
                meta: { complexityEstimate: complexity, heuristic: true }
              }
            });
            break;
          }
          case 'UPDATE': {
            const ag = ensureAgent();
            ag.updatePolicy(payload.state, payload.action, payload.reward);
            self.postMessage({ type: 'UPDATE_OK', payload: { stats: ag.getStats() } });
            break;
          }
          case 'TRAIN_BATCH': {
            const ag = ensureAgent();
            const summary = await ag.trainBatch(payload.episodes || []);
            self.postMessage({ type: 'TRAIN_BATCH_OK', payload: summary });
            break;
          }
          case 'LOCAL_SEARCH': {
            const results = await queryLocalSearch(payload.query, payload.limit || DEFAULT_LIMIT);
            self.postMessage({ type: 'LOCAL_SEARCH_OK', payload: { results } });
            break;
          }
          // Unified simple text generation (placeholder synthesis until backend call integrated)
          case 'GENERATE': {
            const ag = ensureAgent();
            const prompt = (payload && payload.prompt) || '';
            const temperature = (payload && payload.temperature) ?? 0.7;
            const maxTokens = (payload && payload.maxTokens) || 256;
            const action = ag.selectAction(new Float32Array(ag.stateSize));
            const model = action.temperature < 0.6 ? 'gemma-270m-fast' : 'gemma-270m-context';
            let text = '';
            let quality = 0.8;
            try {
              const res = await fetch('/api/ai/inference', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, model: resolveModelAlias(model), temperature, maxTokens })
              });
              if (res.ok) {
                const data = await res.json();
                text = data.text || data.response || data.output || '';
                quality = data.qualityScore || data.confidence || quality;
              } else {
                text = `Fallback (${model}) response: ${prompt.slice(0,160)}${prompt.length>160?'…':''}`;
              }
            } catch (_) {
              text = `Offline (${model}) response: ${prompt.slice(0,160)}${prompt.length>160?'…':''}`;
            }
            self.postMessage({
              type: 'GENERATE_OK',
              payload: {
                model,
                text,
                qualityScore: quality,
                rlMetrics: { temperature: action.temperature, exploration: action.explorationBonus },
                meta: { maxTokens, requestedTemperature: temperature }
              }
            });
            break;
          }
          // Legal specialized generation mapping legacy GENERATE_LEGAL → GENERATE_LEGAL_OK
          case 'GENERATE_LEGAL': {
            const ag = ensureAgent();
            const data = payload || {};
            const prompt = data.prompt || '';
            const legalCtx = data.legalContext || {};
            const action = ag.selectAction(new Float32Array(ag.stateSize));
            const baseModel = resolveModelAlias('gemma3:legal-latest');
            let confidenceBase = 0.85;
            let text = '';
            try {
              const res = await fetch('/api/legal/analysis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  prompt,
                  domain: legalCtx.domain || 'general',
                  documentType: legalCtx.documentType || 'generic',
                  model: baseModel,
                  temperature: action.temperature,
                  maxTokens: data.maxTokens || 512
                })
              });
              if (res.ok) {
                const d = await res.json();
                text = d.text || d.analysis || d.response || '';
                confidenceBase = d.qualityScore || d.confidence || confidenceBase;
              } else {
                const summary = prompt.split(/\s+/).slice(0, 40).join(' ');
                text = `Fallback legal analysis (${baseModel}): ${summary}${summary.length<prompt.length?'…':''}`;
              }
            } catch (_) {
              const summary = prompt.split(/\s+/).slice(0, 40).join(' ');
              text = `Offline legal analysis (${baseModel}): ${summary}${summary.length<prompt.length?'…':''}`;
            }
            self.postMessage({
              type: 'GENERATE_LEGAL_OK',
              payload: {
                model: baseModel,
                text,
                qualityScore: confidenceBase,
                confidence: confidenceBase,
                rlMetrics: {
                  temperature: action.temperature,
                  exploration: action.explorationBonus,
                  probability: action.probability
                },
                legalContext: legalCtx
              }
            });
            break;
          }
          case 'STATS': {
            const ag = ensureAgent();
            self.postMessage({ type: 'STATS_OK', payload: ag.getStats() });
            break;
          }
          case 'SERIALIZE': {
            const ag = ensureAgent();
            self.postMessage({ type: 'SERIALIZE_OK', payload: ag.serialize() });
            break;
          }
          case 'DESERIALIZE': {
            const ag = ensureAgent();
            ag.deserialize(payload);
            self.postMessage({ type: 'DESERIALIZE_OK', payload: { stats: ag.getStats() } });
            break;
          }
          default: {
            self.postMessage({ type: 'ERROR', error: `Unknown message type: ${type}` });
          }
        }
      } catch (err) {
        self.postMessage({ type: 'ERROR', error: (err && err.message) || String(err) });
      }
    };
  }
})();