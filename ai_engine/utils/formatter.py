# ai_engine/utils/formatter.py

def format_multimodal_data(patient_data):
    """
    Creates a concise, human-readable summary of multimodal data for the LLM prompt.
    """
    summary_lines = []

    # 1. Summarize VCF Analysis
    vcf_analysis = patient_data.get('vcfAnalysis')
    if vcf_analysis and vcf_analysis.get('stats'):
        stats = vcf_analysis['stats']
        summary_lines.append("VCF Analysis Summary:")
        if stats.get('actionable_found', 0) > 0:
            summary_lines.append(f"- Found {stats['actionable_found']} actionable variants.")
            if vcf_analysis.get('markers'):
                marker_details = []
                for marker_id, marker_info in vcf_analysis['markers'].items():
                    marker_details.append(f"{marker_info.get('gene', marker_id.upper())} ({marker_info.get('value', 'N/A')})")
                summary_lines.append(f"  - Key markers: {', '.join(marker_details)}.")
        else:
            summary_lines.append("- No actionable variants found in VCF.")
        summary_lines.append(f"- A total of {stats.get('total_vcf_rows', 0)} variants were processed.")
        summary_lines.append("\n")

    # 2. Summarize Pathology Analysis
    pathology_analysis = patient_data.get('pathologyAnalysis')
    if pathology_analysis and pathology_analysis.get('extracted_data'):
        path_data = pathology_analysis['extracted_data']
        summary_lines.append("Pathology Report Summary:")
        if path_data.get('grade'):
            summary_lines.append(f"- Histological Grade: {path_data['grade']}")
        if path_data.get('diagnosis'):
            summary_lines.append(f"- Diagnosis: {path_data['diagnosis']}")
        summary_lines.append("\n")

    # 3. Summarize MRI Analysis (based on available data)
    mri_paths = patient_data.get('mriPaths')
    if mri_paths:
        summary_lines.append("MRI Analysis Summary:")
        modalities = [key.upper() for key in mri_paths.keys() if mri_paths[key]]
        if modalities:
            summary_lines.append(f"- Available scans: {', '.join(modalities)}.")
        # This part can be expanded if MRI analysis results (like tumor volume) are passed in patient_data
        if patient_data.get('tumorVolume'):
             summary_lines.append(f"- Segmented Tumor Volume: {patient_data['tumorVolume']} cm³.")
        summary_lines.append("\n")

    # 4. Summarize Core Clinical Info
    summary_lines.append("Clinical Profile Summary:")
    summary_lines.append(f"- Age: {patient_data.get('age', 'N/A')}, KPS: {patient_data.get('KPS', 'N/A')}")
    summary_lines.append(f"- Cancer Type: {patient_data.get('cancer_type', 'N/A')}, Stage: {patient_data.get('stage', 'N/A')}")
    summary_lines.append("\n")

    if not summary_lines:
        return "No structured multimodal data available. Relying on basic patient info."

    return "\n".join(summary_lines)
