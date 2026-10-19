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
                    additionalArguments: '--scan . --format XML --out rapports/owasp',
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
            sh '''
                reports_destination="$HOME/Projects/AppSec/Blog/rapports"
                if [ ! -d "$(dirname "$reports_destination")" ]; then
                    echo "Application checkout not found for Jenkins agent: $(dirname "$reports_destination")" >&2
                    exit 1
                fi

                mkdir -p "$reports_destination"/trivy "$reports_destination"/nikto "$reports_destination"/owasp
                rm -f "$reports_destination"/trivy/trivy-report.txt
                rm -f "$reports_destination"/nikto/nikto-report.txt
                rm -f "$reports_destination"/owasp/dependency-check-report.xml
                cp -R rapports/. "$reports_destination"/
            '''
        }
    }
}