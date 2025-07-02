import jenkins.model.*
import hudson.security.*
import jenkins.security.s2m.AdminWhitelistRule

def instance = Jenkins.getInstance()

def user = System.getenv('JENKINS_ADMIN_USER') ?: 'admin'
def pass = System.getenv('JENKINS_ADMIN_PASSWORD') ?: 'admin'

def hudsonRealm = new HudsonPrivateSecurityRealm(false)
hudsonRealm.createAccount(user, pass)
instance.setSecurityRealm(hudsonRealm)

def strategy = new FullControlOnceLoggedInAuthorizationStrategy()
instance.setAuthorizationStrategy(strategy)
instance.save()

Jenkins.instance.getInjector().getInstance(AdminWhitelistRule.class).setMasterKillSwitch(false)

// Enable Agent to Controller Security
instance.setSlaveAgentPort(50000)

// Save the state
def location_config = JenkinsLocationConfiguration.get()
location_config.setUrl('http://localhost:8080')
location_config.save()

instance.save()
