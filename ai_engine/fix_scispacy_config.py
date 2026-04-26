import os
import en_core_sci_sm

model_path = en_core_sci_sm.__path__[0]
config_path = os.path.join(model_path, 'en_core_sci_sm-0.5.4', 'config.cfg')

if os.path.exists(config_path):
    with open(config_path, 'r') as f:
        content = f.read()
    
    # Replace string booleans with literal booleans
    # The error showed "include_static_vectors": "False"
    new_content = content.replace('include_static_vectors = "False"', 'include_static_vectors = False')
    new_content = new_content.replace('include_static_vectors = "True"', 'include_static_vectors = True')
    
    if new_content != content:
        with open(config_path, 'w') as f:
            f.write(new_content)
        print(f"✅ Fixed config.cfg at {config_path}")
    else:
        print("ℹ️ No changes needed or patterns not found.")
else:
    print(f"❌ Config file not found at {config_path}")
