import spacy
try:
    nlp = spacy.load("en_core_sci_sm")
    doc = nlp("Angiosarcoma is a rare cancer of the blood vessels.")
    print("Tokens:", [token.text for token in doc])
    print("Entities:", [(ent.text, ent.label_) for ent in doc.ents])
    print("✅ scispacy model loaded and working successfully!")
except Exception as e:
    print(f"❌ Error loading scispacy model: {e}")
