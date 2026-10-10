pipeline {
    agent any
    stages {
        stage('Checkout') {
            steps {
                sh 'git pull origin main'
            }
        }
        stage('Build') {
            steps {
                sh 'docker build --pull --rm -f "Dockerfile" -t blog:latest "."'
            }
        }
        stage('Test') {
            steps {
                echo 'Running unit tests...'
                sh 'trivy image --exit-code 0 --severity MEDIUM,HIGH,CRITICAL --format table -o trivy-report.txt blog:latest'
            }
        }
        stage('Dependency Scan') {
            steps {
                withCredentials([
                    string(credentialsId: 'nvd-api-key', variable: 'NVD_API_KEY')
                    ]) {
                        dependencyCheck(
                            additionalArguments: """
                            --scan .
                            --format XML
                            --nvdApiKey $NVD_API_KEY
                            """,
                            odcInstallation: 'DependencyCheck'
                            )
                    }
            }
        }
        stage('Run') {
            steps {
                sh 'docker stop blog || true'
                sh 'docker rm blog || true'
                sh 'docker run -d -p 3000:3000 --name blog blog'
            }
        }
        stage('Nikto Scan') {
            steps {
                sh ' nikto -h http://localhost:3000/ '
            }
        }
    }
}