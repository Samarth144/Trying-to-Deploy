# ai_engine/utils/formatter.py

def format_multimodal_data(patient_data):
    """
    Creates a concise, human-readable summary of multimodal data for the LLM prompt.
    """
    # 0. Robustness Check for patient_data itself
    if not isinstance(patient_data, dict):
        try:
            import json
            parsed = json.loads(patient_data)
            if isinstance(parsed, dict):
                patient_data = parsed
            else:
                return f"Patient data context: {str(patient_data)}"
        except:
            return f"Patient data context: {str(patient_data)}"

    summary_lines = []

    # Helper to safely get nested data that might be stringified JSON
    def safe_get_dict(data, key):
        val = data.get(key)
        if isinstance(val, str):
            try:
                import json
                parsed = json.loads(val)
                return parsed if isinstance(parsed, dict) else {}
            except:
                return {}
        return val if isinstance(val, dict) else {}

    # 1. Summarize VCF Analysis
    vcf_analysis = safe_get_dict(patient_data, 'vcfAnalysis')
    if vcf_analysis and vcf_analysis.get('stats'):
        stats = vcf_analysis['stats']
        summary_lines.append("VCF Analysis Summary:")
        if isinstance(stats, dict) and stats.get('actionable_found', 0) > 0:
            summary_lines.append(f"- Found {stats['actionable_found']} actionable variants.")
            markers = vcf_analysis.get('markers')
            if isinstance(markers, dict):
                marker_details = []
                for marker_id, marker_info in markers.items():
                    if isinstance(marker_info, dict):
                        marker_details.append(f"{marker_info.get('gene', str(marker_id).upper())} ({marker_info.get('value', 'N/A')})")
                if marker_details:
                    summary_lines.append(f"  - Key markers: {', '.join(marker_details)}.")
        if isinstance(stats, dict):
            summary_lines.append(f"- Total variants processed: {stats.get('total_vcf_rows', 0)}.")
        summary_lines.append("\n")

    # 2. Summarize Pathology Analysis
    pathology_analysis = safe_get_dict(patient_data, 'pathologyAnalysis')
    path_data = pathology_analysis.get('extracted_data') if isinstance(pathology_analysis, dict) else None
    if isinstance(path_data, str): # Handle nested stringification
        try:
            import json
            path_data = json.loads(path_data)
        except: path_data = None

    if isinstance(path_data, dict):
        summary_lines.append("Pathology Report Summary:")
        if path_data.get('grade'):
            summary_lines.append(f"- Histological Grade: {path_data['grade']}")
        if path_data.get('diagnosis'):
            summary_lines.append(f"- Diagnosis: {path_data['diagnosis']}")
        summary_lines.append("\n")

    # 3. Summarize MRI Analysis
    mri_paths = safe_get_dict(patient_data, 'mriPaths')
    if mri_paths:
        summary_lines.append("MRI Analysis Summary:")
        modalities = [key.upper() for key in mri_paths.keys() if mri_paths.get(key)]
        if modalities:
            summary_lines.append(f"- Available scans: {', '.join(modalities)}.")
        if patient_data.get('tumorVolume'):
             summary_lines.append(f"- Segmented Tumor Volume: {patient_data['tumorVolume']} cm³.")
        summary_lines.append("\n")

    # 4. Summarize Core Clinical Info
    summary_lines.append("Clinical Profile Summary:")
    summary_lines.append(f"- Age: {patient_data.get('age', 'N/A')}, KPS: {patient_data.get('KPS', patient_data.get('kps', 'N/A'))}")
    summary_lines.append(f"- Cancer Type: {patient_data.get('cancer_type', patient_data.get('cancerType', 'N/A'))}, Stage: {patient_data.get('stage', 'N/A')}")
    
    symptoms = patient_data.get('symptoms', '')
    if symptoms:
        summary_lines.append(f"- Reported Symptoms: {symptoms}")
        
    comorbidities = patient_data.get('comorbidities', '')
    if comorbidities:
        summary_lines.append(f"- Existing Comorbidities: {comorbidities}")
        
    summary_lines.append("\n")

    if not summary_lines:
        return "No structured multimodal data available."

    return "\n".join(summary_lines)
