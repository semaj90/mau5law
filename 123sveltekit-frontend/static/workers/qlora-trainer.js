/**
 * QLorA Training Web Worker
 * Handles Low-Rank Adaptation training with reinforcement learning
 */

// QLorA configuration and state
let trainingConfig = null;
let currentJob = null;
let isTraining = false;
let trainingState = {
  epoch: 0,
  step: 0,
  loss: 0,
  accuracy: 0,
  learningRate: 0
};

// Simulated QLorA implementation (in production, would use actual ML library)
class QLorATrainer {
  constructor(config = {}) {
    this.config = {
      rank: 16,
      alpha: 32,
      targetModules: ['attention', 'feedforward'],
      dropoutRate: 0.1,
      ...config
    };
    
    this.model = null;
    this.optimizer = null;
    this.lossHistory = [];
    this.reinforcementAgent = new ReinforcementLearningAgent();
  }

  async initialize(modelPath) {
    console.log('Initializing QLorA trainer with model:', modelPath);
    
    // Simulate model initialization
    this.model = {
      parameters: new Map(),
      loraLayers: new Map(),
      baseModel: modelPath
    };

    // Initialize LoRA layers
    for (const module of this.config.targetModules) {
      this.model.loraLayers.set(module, {
        A: this.initializeMatrix(384, this.config.rank),
        B: this.initializeMatrix(this.config.rank, 384),
        scaling: this.config.alpha / this.config.rank
      });
    }

    // Initialize optimizer (AdamW simulation)
    this.optimizer = {
      learningRate: 2e-4,
      beta1: 0.9,
      beta2: 0.999,
      epsilon: 1e-8,
      weightDecay: 0.01,
      momentumBuffers: new Map(),
      varianceBuffers: new Map()
    };

    return true;
  }

  initializeMatrix(rows, cols) {
    const matrix = new Float32Array(rows * cols);
    // Xavier initialization
    const std = Math.sqrt(2.0 / (rows + cols));
    for (let i = 0; i < matrix.length; i++) {
      matrix[i] = this.gaussianRandom() * std;
    }
    return matrix;
  }

  gaussianRandom() {
    // Box-Muller transform for Gaussian random numbers
    const u = Math.random();
    const v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  async trainBatch(batch, reinforcementReward = 0) {
    if (!this.model) {
      throw new Error('Model not initialized');
    }

    const batchSize = batch.length;
    let totalLoss = 0;
    let correctPredictions = 0;

    for (const example of batch) {
      // Forward pass (simplified)
      const prediction = await this.forward(example.input);
      const loss = this.calculateLoss(prediction, example.target);
      
      // Backward pass (simplified)
      const gradients = this.calculateGradients(prediction, example.target, example.input);
      
      // Apply LoRA updates
      this.updateLoRALayers(gradients);
      
      // Reinforcement learning update
      if (reinforcementReward !== 0) {
        this.reinforcementAgent.updatePolicy(example.state, example.action, reinforcementReward);
      }

      totalLoss += loss;
      correctPredictions += this.isCorrectPrediction(prediction, example.target) ? 1 : 0;

      // Yield control periodically
      if (Math.random() < 0.1) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    const avgLoss = totalLoss / batchSize;
    const accuracy = correctPredictions / batchSize;

    this.lossHistory.push(avgLoss);

    return {
      loss: avgLoss,
      accuracy: accuracy,
      gradientNorm: this.calculateGradientNorm(gradients),
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  async forward(input) {
    // Simulate forward pass through model with LoRA layers
    const embedding = this.tokenizeAndEmbed(input);
    
    // Apply base model (simplified)
    let hidden = embedding;
    
    // Apply LoRA modifications
    for (const [module, lora] of this.model.loraLayers) {
      hidden = this.applyLoRA(hidden, lora);
    }
    
    // Generate output probabilities
    return this.softmax(hidden);
  }

  tokenizeAndEmbed(input) {
    // Simplified tokenization and embedding
    const tokens = input.split(/\s+/).slice(0, 512); // Limit sequence length
    const embedding = new Float32Array(tokens.length * 384);
    
    tokens.forEach((token, i) => {
      const tokenHash = this.hashString(token);
      for (let j = 0; j < 384; j++) {
        embedding[i * 384 + j] = Math.sin(tokenHash * (j + 1)) * 0.1;
      }
    });
    
    return embedding;
  }

  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }

  applyLoRA(hidden, lora) {
    // Simplified LoRA application: output = hidden + (hidden * A * B) * scaling
    const result = new Float32Array(hidden.length);
    
    for (let i = 0; i < hidden.length; i++) {
      result[i] = hidden[i];
      
      // Apply low-rank adaptation
      let loraOutput = 0;
      for (let j = 0; j < lora.A.length / 384; j++) {
        let intermediate = 0;
        for (let k = 0; k < 384; k++) {
          intermediate += hidden[k] * lora.A[j * 384 + k];
        }
        loraOutput += intermediate * lora.B[j * 384 + (i % 384)];
      }
      
      result[i] += loraOutput * lora.scaling;
    }
    
    return result;
  }

  softmax(logits) {
    const maxLogit = Math.max(...logits);
    const exps = logits.map(x => Math.exp(x - maxLogit));
    const sumExps = exps.reduce((a, b) => a + b, 0);
    return exps.map(x => x / sumExps);
  }

  calculateLoss(prediction, target) {
    // Cross-entropy loss
    let loss = 0;
    for (let i = 0; i < Math.min(prediction.length, target.length); i++) {
      if (target[i] > 0) {
        loss -= target[i] * Math.log(Math.max(prediction[i], 1e-10));
      }
    }
    return loss;
  }

  calculateGradients(prediction, target, input) {
    // Simplified gradient calculation
    const gradients = new Map();
    
    for (const [module, lora] of this.model.loraLayers) {
      const gradA = new Float32Array(lora.A.length);
      const gradB = new Float32Array(lora.B.length);
      
      // Simplified gradient computation
      const error = prediction.map((p, i) => p - (target[i] || 0));
      
      for (let i = 0; i < gradA.length; i++) {
        gradA[i] = error[i % error.length] * 0.01;
      }
      
      for (let i = 0; i < gradB.length; i++) {
        gradB[i] = error[i % error.length] * 0.01;
      }
      
      gradients.set(module, { A: gradA, B: gradB });
    }
    
    return gradients;
  }

  updateLoRALayers(gradients) {
    for (const [module, grad] of gradients) {
      const lora = this.model.loraLayers.get(module);
      if (!lora) continue;
      
      // Adam optimizer update (simplified)
      this.adamUpdate(lora.A, grad.A, `${module}_A`);
      this.adamUpdate(lora.B, grad.B, `${module}_B`);
    }
  }

  adamUpdate(params, gradients, key) {
    if (!this.optimizer.momentumBuffers.has(key)) {
      this.optimizer.momentumBuffers.set(key, new Float32Array(params.length));
      this.optimizer.varianceBuffers.set(key, new Float32Array(params.length));
    }
    
    const momentum = this.optimizer.momentumBuffers.get(key);
    const variance = this.optimizer.varianceBuffers.get(key);
    
    for (let i = 0; i < params.length; i++) {
      // Update biased first moment estimate
      momentum[i] = this.optimizer.beta1 * momentum[i] + (1 - this.optimizer.beta1) * gradients[i];
      
      // Update biased second raw moment estimate
      variance[i] = this.optimizer.beta2 * variance[i] + (1 - this.optimizer.beta2) * gradients[i] * gradients[i];
      
      // Compute bias-corrected first moment estimate
      const mHat = momentum[i] / (1 - Math.pow(this.optimizer.beta1, trainingState.step + 1));
      
      // Compute bias-corrected second raw moment estimate
      const vHat = variance[i] / (1 - Math.pow(this.optimizer.beta2, trainingState.step + 1));
      
      // Update parameters
      params[i] -= this.optimizer.learningRate * mHat / (Math.sqrt(vHat) + this.optimizer.epsilon);
      
      // Weight decay
      params[i] *= (1 - this.optimizer.learningRate * this.optimizer.weightDecay);
    }
  }

  calculateGradientNorm(gradients) {
    let norm = 0;
    for (const [, grad] of gradients) {
      for (const value of grad.A) {
        norm += value * value;
      }
      for (const value of grad.B) {
        norm += value * value;
      }
    }
    return Math.sqrt(norm);
  }

  isCorrectPrediction(prediction, target) {
    // Simplified accuracy check
    const predClass = prediction.indexOf(Math.max(...prediction));
    const targetClass = target.indexOf(Math.max(...target));
    return predClass === targetClass;
  }

  estimateMemoryUsage() {
    // Estimate memory usage in bytes
    let usage = 0;
    
    for (const [, lora] of this.model.loraLayers) {
      usage += lora.A.byteLength + lora.B.byteLength;
    }
    
    usage += this.lossHistory.length * 4; // Float32 per loss value
    usage += 1024 * 1024; // Base overhead (1MB)
    
    return usage;
  }

  saveModel(path) {
    // Simulate model saving
    const modelData = {
      config: this.config,
      loraLayers: {},
      lossHistory: this.lossHistory,
      timestamp: Date.now()
    };
    
    for (const [module, lora] of this.model.loraLayers) {
      modelData.loraLayers[module] = {
        A: Array.from(lora.A),
        B: Array.from(lora.B),
        scaling: lora.scaling
      };
    }
    
    return JSON.stringify(modelData);
  }
}

// Reinforcement Learning Agent for training optimization
class ReinforcementLearningAgent {
  constructor() {
    this.qTable = new Map();
    this.epsilon = 0.3; // Exploration rate
    this.alpha = 0.1; // Learning rate
    this.gamma = 0.9; // Discount factor
    this.rewardHistory = [];
    this.episodeCount = 0;
  }

  getState(loss, accuracy, gradientNorm) {
    // Discretize continuous values into state
    const lossLevel = loss < 0.5 ? 'low' : loss < 1.0 ? 'medium' : 'high';
    const accLevel = accuracy > 0.8 ? 'high' : accuracy > 0.6 ? 'medium' : 'low';
    const gradLevel = gradientNorm < 0.1 ? 'low' : gradientNorm < 1.0 ? 'medium' : 'high';
    
    return `${lossLevel}_${accLevel}_${gradLevel}`;
  }

  selectAction(state) {
    const actions = ['increase_lr', 'decrease_lr', 'adjust_batch', 'modify_rank', 'continue'];
    
    if (Math.random() < this.epsilon) {
      // Exploration: random action
      return actions[Math.floor(Math.random() * actions.length)];
    }
    
    // Exploitation: best known action
    const stateActions = this.qTable.get(state) || new Map();
    let bestAction = actions[0];
    let bestValue = -Infinity;
    
    for (const action of actions) {
      const value = stateActions.get(action) || 0;
      if (value > bestValue) {
        bestValue = value;
        bestAction = action;
      }
    }
    
    return bestAction;
  }

  updatePolicy(state, action, reward) {
    if (!this.qTable.has(state)) {
      this.qTable.set(state, new Map());
    }
    
    const stateActions = this.qTable.get(state);
    const currentQ = stateActions.get(action) || 0;
    
    // Q-learning update: Q(s,a) = Q(s,a) + α[r + γ*max(Q(s',a')) - Q(s,a)]
    const newQ = currentQ + this.alpha * (reward - currentQ);
    stateActions.set(action, newQ);
    
    this.rewardHistory.push(reward);
    
    // Decay exploration rate
    this.epsilon = Math.max(0.1, this.epsilon * 0.999);
  }

  executeAction(action, trainer) {
    switch (action) {
      case 'increase_lr':
        trainer.optimizer.learningRate *= 1.1;
        break;
      case 'decrease_lr':
        trainer.optimizer.learningRate *= 0.9;
        break;
      case 'adjust_batch':
        // Would adjust batch size in real implementation
        break;
      case 'modify_rank':
        // Would adjust LoRA rank in real implementation
        break;
      case 'continue':
        // No change
        break;
    }
    
    return action;
  }

  getStats() {
    const recentRewards = this.rewardHistory.slice(-100);
    const averageReward = recentRewards.length > 0 ? 
      recentRewards.reduce((a, b) => a + b, 0) / recentRewards.length : 0;
    
    return {
      episodeCount: this.episodeCount,
      averageReward,
      bestReward: Math.max(...this.rewardHistory, 0),
      explorationRate: this.epsilon,
      qTableSize: this.qTable.size
    };
  }
}

// Initialize trainer
let trainer = new QLorATrainer();

// Worker message handlers
self.addEventListener('message', async (event) => {
  const { type, data } = event.data;

  try {
    switch (type) {
      case 'init':
        await handleInit(data);
        break;
      case 'start_training':
        await handleStartTraining(data);
        break;
      case 'pause_training':
        await handlePauseTraining();
        break;
      case 'resume_training':
        await handleResumeTraining();
        break;
      case 'stop_training':
        await handleStopTraining();
        break;
      default:
        console.warn('Unknown message type:', type);
    }
  } catch (error) {
    self.postMessage({
      type: 'training_error',
      data: { error: error.message }
    });
  }
});

async function handleInit(config) {
  trainingConfig = config;
  await trainer.initialize(config.modelPath);
  
  console.log('QLorA trainer initialized');
}

async function handleStartTraining(jobData) {
  if (isTraining) {
    throw new Error('Training already in progress');
  }

  currentJob = jobData.job;
  isTraining = true;
  
  const config = currentJob.config;
  const dataPoints = currentJob.dataPoints;
  
  // Initialize training state
  trainingState = {
    epoch: 0,
    step: 0,
    loss: 0,
    accuracy: 0,
    learningRate: config.trainingParams.learningRate
  };

  console.log(`Starting QLorA training with ${dataPoints.length} examples`);

  try {
    // Training loop
    for (let epoch = 0; epoch < config.trainingParams.epochs && isTraining; epoch++) {
      trainingState.epoch = epoch;
      
      // Shuffle data
      const shuffledData = shuffleArray([...dataPoints]);
      
      // Process in batches
      const batchSize = config.trainingParams.batchSize;
      let epochLoss = 0;
      let epochAccuracy = 0;
      let batchCount = 0;

      for (let i = 0; i < shuffledData.length && isTraining; i += batchSize) {
        const batch = shuffledData.slice(i, Math.min(i + batchSize, shuffledData.length));
        
        // Convert training data to trainer format
        const formattedBatch = batch.map(dp => ({
          input: dp.prompt,
          target: createTargetVector(dp.completion),
          state: trainer.reinforcementAgent.getState(trainingState.loss, trainingState.accuracy, 0),
          action: 'continue'
        }));

        // Train batch
        const batchResults = await trainer.trainBatch(formattedBatch);
        
        // Update training state
        trainingState.step++;
        epochLoss += batchResults.loss;
        epochAccuracy += batchResults.accuracy;
        batchCount++;

        // Reinforcement learning update
        if (config.useReinforcementLearning) {
          const reward = calculateReward(batchResults.loss, batchResults.accuracy);
          const state = trainer.reinforcementAgent.getState(batchResults.loss, batchResults.accuracy, batchResults.gradientNorm);
          const action = trainer.reinforcementAgent.selectAction(state);
          
          trainer.reinforcementAgent.updatePolicy(state, action, reward);
          trainer.reinforcementAgent.executeAction(action, trainer);
          
          // Send RL update
          self.postMessage({
            type: 'reinforcement_update',
            data: {
              reward,
              action,
              state,
              qValue: trainer.reinforcementAgent.qTable.get(state)?.get(action) || 0
            }
          });
        }

        // Send progress update
        trainingState.loss = epochLoss / Math.max(batchCount, 1);
        trainingState.accuracy = epochAccuracy / Math.max(batchCount, 1);
        
        self.postMessage({
          type: 'training_progress',
          data: {
            progress: {
              currentEpoch: epoch + 1,
              totalEpochs: config.trainingParams.epochs,
              currentStep: trainingState.step,
              totalSteps: currentJob.progress.totalSteps,
              loss: trainingState.loss,
              accuracy: trainingState.accuracy,
              validationLoss: trainingState.loss * (0.95 + Math.random() * 0.1) // Simulated
            },
            metrics: {
              trainingTime: Date.now() - currentJob.startedAt,
              memoryUsage: batchResults.memoryUsage,
              gpuUtilization: Math.random() * 0.8 + 0.2, // Simulated
              throughput: (batchSize * 1000) / (Date.now() - (currentJob.lastUpdate || Date.now() - 1000))
            },
            reinforcementLearning: config.useReinforcementLearning ? trainer.reinforcementAgent.getStats() : null
          }
        });

        // Yield control periodically
        if (trainingState.step % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      console.log(`Epoch ${epoch + 1} completed. Loss: ${trainingState.loss.toFixed(4)}, Accuracy: ${trainingState.accuracy.toFixed(3)}`);
    }

    if (isTraining) {
      // Training completed successfully
      const modelData = trainer.saveModel(config.outputDir);
      
      self.postMessage({
        type: 'training_completed',
        data: {
          finalLoss: trainingState.loss,
          finalAccuracy: trainingState.accuracy,
          totalSteps: trainingState.step,
          modelPath: config.outputDir,
          modelData,
          reinforcementStats: trainer.reinforcementAgent.getStats()
        }
      });
    }

  } catch (error) {
    console.error('Training error:', error);
    self.postMessage({
      type: 'training_error',
      data: { error: error.message }
    });
  } finally {
    isTraining = false;
    currentJob = null;
  }
}

async function handlePauseTraining() {
  if (!isTraining) return;
  
  isTraining = false;
  console.log('Training paused');
}

async function handleResumeTraining() {
  if (isTraining || !currentJob) return;
  
  isTraining = true;
  console.log('Training resumed');
  
  // Resume training would be implemented here
}

async function handleStopTraining() {
  isTraining = false;
  currentJob = null;
  console.log('Training stopped');
}

// Utility functions
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function createTargetVector(text) {
  // Convert text to target vector (simplified)
  const vocab = ['legal', 'case', 'evidence', 'court', 'judge', 'law', 'statute', 'precedent', 'plaintiff', 'defendant'];
  const vector = new Float32Array(vocab.length);
  
  const words = text.toLowerCase().split(/\s+/);
  vocab.forEach((word, i) => {
    vector[i] = words.includes(word) ? 1.0 : 0.0;
  });
  
  return vector;
}

function calculateReward(loss, accuracy) {
  // Calculate reward based on training metrics
  const lossReward = Math.max(0, 1.0 - loss); // Higher reward for lower loss
  const accuracyReward = accuracy; // Direct accuracy reward
  
  return (lossReward + accuracyReward) / 2;
}

console.log('QLorA Training Worker initialized');