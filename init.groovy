import jenkins.model.*
import hudson.security.*

// Create admin user
def instance = Jenkins.getInstance()

def hudsonRealm = new HudsonPrivateSecurityRealm(false)
instance.setSecurityRealm(hudsonRealm)

// Set up initial admin user
hudsonRealm.createAccount('admin', 'admin123')

// Save the configuration
instance.save()
