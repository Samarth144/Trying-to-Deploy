# rag/retriever_hybrid.py

from rag.retriever_local import retrieve_local_cancer
from rag.retriever_online import retrieve_pubmed_evidence


def hybrid_retrieve(cancer, query, queries, k_local=5, k_online=3):
    # -------------------------
    # OFFLINE NCCN EVIDENCE
    # -------------------------
    local_results = retrieve_local_cancer(
        cancer,
        query,
        k=k_local
    )

    for r in local_results:
        r["source"] = f"NCCN-{cancer}"

    # -------------------------
    # ONLINE PUBMED EVIDENCE
    # -------------------------
    online_results = retrieve_pubmed_evidence(
        queries,
        k=k_online
    )

    # -------------------------
    # MERGE
    # -------------------------
    combined = local_results + online_results

    return combined
