pipeline {
    agent any
    
    environment {
        NODE_VERSION = '18'
    }
    
    stages {
        stage('Install Dependencies') {
            steps {
                echo 'Installing dependencies...'
                script {
                    // Install Node.js and npm
                    sh 'curl -fsSL https://deb.nodesource.com/setup_18.x | bash -'
                    sh 'apt-get install -y nodejs'
                    
                    // Verify installation
                    sh 'node --version'
                    sh 'npm --version'
                    
                    // Install project dependencies
                    sh 'npm install'
                }
            }
        }
        
        stage('Build') {
            steps {
                echo 'Building the application...'
                script {
                    sh 'npm run build'
                }
            }
        }
        
        stage('Test') {
            steps {
                echo 'Checking for test script...'
                script {
                    def testScriptExists = sh(script: 'npm list scripts | grep test', returnStatus: true) == 0
                    if (testScriptExists) {
                        echo 'Running tests...'
                        sh 'npm test'
                    } else {
                        echo 'No test script found in package.json, skipping tests'
                    }
                }
            }
        }
        
        stage('Build Docker Image') {
            steps {
                echo 'Building Docker image...'
                script {
                    def customImage = docker.build('dms-app:${env.BUILD_NUMBER}')
                }
            }
        }
    }
    
    post {
        always {
            echo 'Cleaning up workspace...'
            cleanWs()
        }
        success {
            echo 'Pipeline completed successfully!'
        }
        failure {
            echo 'Pipeline failed!'
        }
    }
}
