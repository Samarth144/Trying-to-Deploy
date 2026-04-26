# vcf_parser.py
import re
import json
import os

# Base directory for the AI engine
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG_DIR = os.path.join(BASE_DIR, "config")
HOTSPOT_MAP_PATH = os.path.join(CONFIG_DIR, "hotspots.json")

# Load HOTSPOT_MAP dynamically
try:
    with open(HOTSPOT_MAP_PATH, 'r', encoding='utf-8') as f:
        HOTSPOT_MAP = json.load(f)
except FileNotFoundError:
    print(f"Error: hotspots.json not found at {HOTSPOT_MAP_PATH}. Please create it.")
    HOTSPOT_MAP = {} # Fallback to empty map
except json.JSONDecodeError:
    print(f"Error: Invalid JSON in {HOTSPOT_MAP_PATH}.")
    HOTSPOT_MAP = {} # Fallback to empty map


def parse_vcf_text(vcf_content):
    """
    Parses raw VCF text content and extracts actionable clinical markers.
    """
    found_markers = {}
    total_variants = 0
    
    try:
        lines = vcf_content.splitlines()
        for line in lines:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            
            total_variants += 1
            parts = line.split('\t') # Usually tab-separated
            if len(parts) < 8:
                continue

            chrom = parts[0].replace('chr', '')
            pos = parts[1]
            ref = parts[3]
            alt = parts[4]
            info = parts[7]

            key = f"{chrom}:{pos}"
            
            if key in HOTSPOT_MAP:
                hotspot = HOTSPOT_MAP[key]
                marker_id = hotspot['marker']
                
                af_match = re.search(r"AF=([0-9.]+)", info)
                af = float(af_match.group(1)) if af_match else 1.0

                if af > 0.4:
                    significance = "Pathogenic (Clonal)"
                    evidence_tier = "Tier 1"
                elif af > 0.15:
                    significance = "Pathogenic (Subclonal)"
                    evidence_tier = "Tier 2"
                elif af > 0.05:
                    significance = "VUS (Low Frequency)"
                    evidence_tier = "Tier 3"
                else:
                    significance = "Variant of Unknown Significance"
                    evidence_tier = "Tier 4"

                found_markers[marker_id] = {
                    "gene": hotspot['gene'],
                    "value": hotspot['value'],
                    "coordinate": key,
                    "ref_alt": f"{ref}>{alt}",
                    "allele_freq": af,
                    "significance": significance,
                    "evidence_tier": evidence_tier
                }

        return {
            "success": True,
            "markers": found_markers,
            "stats": {
                "total_vcf_rows": total_variants,
                "actionable_found": len(found_markers),
                "tier_1_clonal": sum(1 for m in found_markers.values() if m["evidence_tier"] == "Tier 1"),
                "tier_2_subclonal": sum(1 for m in found_markers.values() if m["evidence_tier"] == "Tier 2"),
                "tier_3_vus": sum(1 for m in found_markers.values() if m["evidence_tier"] == "Tier 3"),
                "uncertain_variants": sum(1 for m in found_markers.values() if m["evidence_tier"] == "Tier 4")
            }
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


def parse_vcf(file_path):
    """
    Parses a VCF file and extracts actionable clinical markers.
    Returns a dictionary of found markers and a confidence report.
    """
    found_markers = {}
    total_variants = 0
    analyzed_variants = 0

    try:
        # Try reading with utf-8-sig first (handles BOM)
        try:
            with open(file_path, 'r', encoding='utf-8-sig') as f:
                lines = f.readlines()
        except UnicodeDecodeError:
            # Fallback to utf-16 if utf-8 fails (common on Windows)
            with open(file_path, 'r', encoding='utf-16') as f:
                lines = f.readlines()

        for line in lines:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            
            total_variants += 1
            parts = line.split('	')
            if len(parts) < 8:
                continue

            chrom = parts[0].replace('chr', '')
            pos = parts[1]
            ref = parts[3]
            alt = parts[4]
            info = parts[7]

            key = f"{chrom}:{pos}"
            
            # Check if this variant is in our actionable hotspot database
            if key in HOTSPOT_MAP:
                hotspot = HOTSPOT_MAP[key]
                marker_id = hotspot['marker']
                
                # Extract Allele Frequency (AF) if available for confidence
                af_match = re.search(r"AF=([0-9.]+)", info)
                af = float(af_match.group(1)) if af_match else 1.0

                # Advanced Hackathon-Level Significance Logic
                if af > 0.4:
                    significance = "Pathogenic (Clonal)"
                    evidence_tier = "Tier 1"
                elif af > 0.15:
                    significance = "Pathogenic (Subclonal)"
                    evidence_tier = "Tier 2"
                elif af > 0.05:
                    significance = "VUS (Low Frequency)"
                    evidence_tier = "Tier 3"
                else:
                    significance = "Variant of Unknown Significance"
                    evidence_tier = "Tier 4"

                found_markers[marker_id] = {
                    "gene": hotspot['gene'],
                    "value": hotspot['value'],
                    "coordinate": key,
                    "ref_alt": f"{ref}>{alt}",
                    "allele_freq": af,
                    "significance": significance,
                    "evidence_tier": evidence_tier
                }
                analyzed_variants += 1

        return {
            "success": True,
            "markers": found_markers,
            "stats": {
                "total_vcf_rows": total_variants,
                "actionable_found": len(found_markers),
                "tier_1_clonal": sum(1 for m in found_markers.values() if m["evidence_tier"] == "Tier 1"),
                "tier_2_subclonal": sum(1 for m in found_markers.values() if m["evidence_tier"] == "Tier 2"),
                "tier_3_vus": sum(1 for m in found_markers.values() if m["evidence_tier"] == "Tier 3"),
                "uncertain_variants": sum(1 for m in found_markers.values() if m["evidence_tier"] == "Tier 4"),
                "unfiltered_variants": total_variants - len(found_markers)
            }
        }

    except Exception as e:
        return {"success": False, "error": str(e)}
