def DOCKER_REGISTRY = 'your-dockerhub-username'
def DOCKER_IMAGE_NAME = 'dms-app'

def VERSION = "${env.BUILD_NUMBER}"
def ENV = "${params.ENVIRONMENT ?: 'staging'}"

pipeline {
    agent any

    environment {
        // Make credentials optional with null checks
        DOCKER_CREDENTIALS = ''
        SONAR_TOKEN = ''
        NPM_TOKEN = ''
    }

    parameters {
        choice(
            name: 'ENVIRONMENT',
            choices: ['staging', 'production'],
            description: 'Select deployment environment'
        )
        booleanParam(
            name: 'SKIP_TESTS',
            defaultValue: false,
            description: 'Skip running tests'
        )
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        disableConcurrentBuilds()
        timeout(time: 30, unit: 'MINUTES')
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                sh 'git submodule update --init --recursive'
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'npm ci --prefer-offline'
            }
        }

        stage('Lint') {
            steps {
                sh 'npm run lint'
            }
        }

        stage('Unit Tests') {
            when {
                expression { !params.SKIP_TESTS }
            }
            steps {
                script {
                    def testScriptExists = sh(script: 'npm list scripts | grep test', returnStatus: true) == 0
                    if (testScriptExists) {
                        sh 'npm test -- --coverage'
                    } else {
                        echo 'No test script found in package.json, skipping tests'
                    }
                }
            }
            post {
                always {
                    junit '**/test-results.xml'
                    publishHTML(target: [
                        allowMissing: true,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: 'coverage',
                        reportFiles: 'lcov-report/index.html',
                        reportName: 'Code Coverage Report'
                    ])
                }
            }
        }

        stage('SonarQube Analysis') {
            when {
                // Only run if SONAR_TOKEN is available
                environment name: 'SONAR_TOKEN', value: ''
                not {
                    equals expected: '', actual: env.SONAR_TOKEN
                }
            }
            environment {
                SCANNER_HOME = tool 'SonarQubeScanner'
            }
            steps {
                script {
                    try {
                        withSonarQubeEnv('SonarQube') {
                            sh '''
                                $SCANNER_HOME/bin/sonar-scanner \
                                -Dsonar.projectKey=dms \
                                -Dsonar.projectName=DMS \
                                -Dsonar.sources=. \
                                -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info
                            '''
                        }
                    } catch (err) {
                        echo "SonarQube analysis skipped or failed: ${err.message}"
                    }
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    docker.withRegistry('https://index.docker.io/v1/', 'docker-hub-credentials') {
                        def customImage = docker.build("${DOCKER_REGISTRY}/${DOCKER_IMAGE_NAME}:${VERSION}")
                        customImage.push()
                        
                        if (env.BRANCH_NAME == 'main') {
                            customImage.push('latest')
                        }
                    }
                }
            }
        }

        stage('Security Scan') {
            steps {
                script {
                    sh 'docker scan --login --token ${DOCKER_SCAN_TOKEN}'
                    sh "docker scan ${DOCKER_REGISTRY}/${DOCKER_IMAGE_NAME}:${VERSION} --severity high"
                }
            }
        }

        stage('Deploy') {
            when {
                expression { return params.ENVIRONMENT }
            }
            steps {
                script {
                    def composeFile = "docker-compose.${ENV}.yml"
                    sshagent(['deploy-key']) {
                        sh """
                            ssh -o StrictHostKeyChecking=no ${ENV}-server \
                            "cd /opt/dms && \
                             docker-compose -f ${composeFile} pull && \
                             docker-compose -f ${composeFile} up -d --force-recreate"
                        """
                    }
                }
            }
        }
    }

    post {
        always {
            script {
                // Clean up workspace if we're inside a node block
                if (env.NODE_NAME != null) {
                    cleanWs()
                }
                
                if (currentBuild.resultIsBetterOrEqualTo('SUCCESS')) {
                    slackSend(
                        color: 'good',
                        message: "✅ ${currentBuild.fullDisplayName} - ${currentBuild.currentResult}"
                    )
                } else {
                    slackSend(
                        color: 'danger',
                        message: "❌ ${currentBuild.fullDisplayName} - ${currentBuild.currentResult}"
                    )
                }
            }
        }
    }
}
