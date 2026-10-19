pipeline {
    agent any
    stages {
        stage('Checkout') {
            steps {
                sh 'git pull origin main'
            }
        }
        stage('Prepare reports') {
            steps {
                sh '''
                    mkdir -p rapports/trivy rapports/nikto rapports/owasp
                    rm -f rapports/trivy/trivy-report.txt
                    rm -f rapports/nikto/nikto-report.txt
                    rm -f rapports/owasp/dependency-check-report.xml
                    rm -f rapports/owasp/dependency-check-report.html
                '''
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
                sh 'trivy image --exit-code 0 --severity MEDIUM,HIGH,CRITICAL --format table -o rapports/trivy/trivy-report.txt blog:latest'
            }
        }
        stage('Dependency Scan') {
            steps {
                dependencyCheck(
                    additionalArguments: '--scan . --format XML --format HTML --out rapports/owasp',
                    odcInstallation: 'DependencyCheck',
                    nvdCredentialsId: 'nvd-api-key'
                )
//                dependencyCheckPublisher pattern: '**/dependency-check-report.xml'
            }
        }
        stage('Run') {
            steps {
                sh 'docker stop blog || true'
                sh 'docker rm blog || true'
                sh 'docker run -d -p 3000:3000 --name blog blog'
            }
        }

        stage('Install') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Unit Tests') {
            steps {
                sh 'npm test'
            }
        }
        stage('Nikto Scan') {
            steps {
                sh 'nikto -h http://localhost:3000/ -output rapports/nikto/nikto-report.txt || true'
            }
        }
    }
    post {
        always {
            archiveArtifacts artifacts: 'rapports/**', allowEmptyArchive: true
        }
    }
}