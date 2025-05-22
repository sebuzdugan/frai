#!/usr/bin/env python
# Sample AI model for testing the Framework-RAI scanner
# TEST 2
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
import tensorflow as tf

# Load and prepare data
def prepare_data(dataset_path):
    """Load and prepare dataset for training"""
    data = pd.read_csv(dataset_path)
    X = data.drop('target', axis=1)
    y = data['target']
    
    # Split the data
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    return X_train, X_test, y_train, y_test

# Traditional ML model
def train_rf_model(X_train, y_train):
    """Train a random forest model"""
    model = RandomForestClassifier(n_estimators=100)
    model.fit(X_train, y_train)
    return model

# Evaluate model
def evaluate_model(model, X_test, y_test):
    """Evaluate the trained model"""
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    report = classification_report(y_test, y_pred)
    
    print(f"Model Accuracy: {accuracy:.4f}")
    print("Classification Report:")
    print(report)
    
    return accuracy, report

# Neural network example
def create_nn_model(input_shape):
    """Create a simple neural network"""
    model = tf.keras.Sequential([
        tf.keras.layers.Dense(64, activation='relu', input_shape=(input_shape,)),
        tf.keras.layers.Dropout(0.2),
        tf.keras.layers.Dense(32, activation='relu'),
        tf.keras.layers.Dense(1, activation='sigmoid')
    ])
    
    model.compile(
        optimizer='adam',
        loss='binary_crossentropy',
        metrics=['accuracy']
    )
    
    return model

# Main function
def main():
    # Example usage
    X_train, X_test, y_train, y_test = prepare_data("data/sample_dataset.csv")
    
    # Train and evaluate Random Forest
    rf_model = train_rf_model(X_train, y_train)
    rf_accuracy, rf_report = evaluate_model(rf_model, X_test, y_test)
    
    # Train and evaluate Neural Network
    input_shape = X_train.shape[1]
    nn_model = create_nn_model(input_shape)
    nn_model.fit(X_train, y_train, epochs=10, batch_size=32, validation_split=0.1)
    
    # Evaluate neural network
    nn_evaluation = nn_model.evaluate(X_test, y_test)
    print(f"Neural Network Loss: {nn_evaluation[0]:.4f}")
    print(f"Neural Network Accuracy: {nn_evaluation[1]:.4f}")
    
    # Save the models
    rf_model_path = "models/random_forest_model.pkl"
    nn_model_path = "models/neural_network_model.h5"
    
    # You would save the models here
    # import pickle
    # with open(rf_model_path, 'wb') as f:
    #     pickle.dump(rf_model, f)
    # nn_model.save(nn_model_path)
    
    print("Model training and evaluation complete!")

if __name__ == "__main__":
    main() 