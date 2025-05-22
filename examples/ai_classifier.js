// Sample JavaScript AI classifier for testing the Framework-RAI scanner

// Import TensorFlow.js
import * as tf from '@tensorflow/tfjs';
import * as tfvis from '@tensorflow/tfjs-vis';

// Define model parameters
const NUM_EPOCHS = 20;
const BATCH_SIZE = 32;
const LEARNING_RATE = 0.01;

// Create a simple classifier model
function createModel() {
  const model = tf.sequential();
  
  // Add layers
  model.add(tf.layers.dense({
    inputShape: [10],
    units: 32,
    activation: 'relu'
  }));
  
  model.add(tf.layers.dropout({ rate: 0.2 }));
  
  model.add(tf.layers.dense({
    units: 16,
    activation: 'relu'
  }));
  
  model.add(tf.layers.dense({
    units: 3,
    activation: 'softmax'
  }));
  
  // Compile model
  model.compile({
    optimizer: tf.train.adam(LEARNING_RATE),
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy']
  });
  
  return model;
}

// Preprocess data
async function preprocessData(dataUrl) {
  // Fetch data
  const response = await fetch(dataUrl);
  const data = await response.json();
  
  // Normalize features
  const features = tf.tensor2d(data.features).div(tf.scalar(255.0));
  
  // One-hot encode labels
  const labels = tf.tensor1d(data.labels, 'int32');
  const oneHotLabels = tf.oneHot(labels, 3);
  
  return {
    features,
    labels: oneHotLabels
  };
}

// Train model
async function trainModel(model, data) {
  const { features, labels } = data;
  
  // Define callback for visualization
  const callbacks = {
    onEpochEnd: (epoch, logs) => {
      console.log(`Epoch ${epoch}: loss = ${logs.loss}, accuracy = ${logs.acc}`);
      
      // Update training visualization (if using tfvis)
      tfvis.show.history({ name: 'Training Performance' }, 
                         { values: [{ epoch, loss: logs.loss, accuracy: logs.acc }] }, 
                         ['loss', 'accuracy']);
    }
  };
  
  // Start training
  return await model.fit(features, labels, {
    epochs: NUM_EPOCHS,
    batchSize: BATCH_SIZE,
    shuffle: true,
    callbacks: callbacks
  });
}

// Evaluate model
async function evaluateModel(model, testData) {
  const { features, labels } = testData;
  
  // Get model predictions
  const predictions = model.predict(features);
  
  // Calculate accuracy
  const argMax = predictions.argMax(1);
  const labelArgMax = labels.argMax(1);
  const equality = argMax.equal(labelArgMax);
  const accuracy = equality.mean();
  
  // Convert to scalar and print
  const accuracyValue = await accuracy.data();
  console.log(`Model accuracy: ${accuracyValue[0]}`);
  
  return accuracyValue[0];
}

// Main function
async function main() {
  try {
    // Load and preprocess data
    console.log('Loading training data...');
    const trainingData = await preprocessData('data/training_data.json');
    
    console.log('Loading test data...');
    const testData = await preprocessData('data/test_data.json');
    
    // Create model
    console.log('Creating model...');
    const model = createModel();
    
    // Display model summary
    model.summary();
    
    // Train model
    console.log('Training model...');
    await trainModel(model, trainingData);
    
    // Evaluate model
    console.log('Evaluating model...');
    const accuracy = await evaluateModel(model, testData);
    
    // Save model
    await model.save('localstorage://my-classifier-model');
    console.log('Model saved to browser local storage.');
    
    console.log('Training complete!');
  } catch (error) {
    console.error('Error in training:', error);
  }
}

// Run the main function
main(); 