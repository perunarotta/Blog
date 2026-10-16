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
        stage('Trivy test') {
            steps {
                echo 'Running unit tests...'
                sh 'trivy image --exit-code 0 --severity MEDIUM,HIGH,CRITICAL --format table -o trivy-report.txt blog:latest'
            }
        }
        stage('Dependency Scan') {
            steps {
                dependencyCheck(
                    additionalArguments: '--scan . --format XML',
                    odcInstallation: 'DependencyCheck',
                    nvdCredentialsId: 'nvd-api-key'
                )
                dependencyCheckPublisher pattern: '**/dependency-check-report.xml'
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
                sh 'nikto -h http://localhost:3000/ -output nikto-report.txt || true'
            }
        }
    }
}