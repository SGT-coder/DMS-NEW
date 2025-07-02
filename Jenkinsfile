pipeline {
    agent {
        docker {
            image 'node:18'
            args '-u root'
        }
    }
    
    stages {
        stage('Install Dependencies') {
            steps {
                echo 'Installing dependencies...'
                script {
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
