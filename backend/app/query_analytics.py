from pathlib import Path
import json
from datetime import datetime
from collections import Counter


# ============================================================
# M4.1 QUERY ANALYTICS & KNOWLEDGE GAP DETECTION
# ============================================================

ANALYTICS_DIR = Path("data/analytics")

ANALYTICS_DIR.mkdir(
    parents=True,
    exist_ok=True
)

ANALYTICS_FILE = (
    ANALYTICS_DIR /
    "query_analytics.json"
)


# ============================================================
# CONFIGURATION
# ============================================================

LOW_CONFIDENCE_THRESHOLD = 0.50

HIGH_DISTANCE_THRESHOLD = 1.00


# ============================================================
# INITIALIZE ANALYTICS STORAGE
# ============================================================

def initialize_analytics():

    if not ANALYTICS_FILE.exists():

        with open(
            ANALYTICS_FILE,
            "w",
            encoding="utf-8"
        ) as file:

            json.dump(
                [],
                file,
                indent=4
            )


# ============================================================
# LOAD ANALYTICS
# ============================================================

def load_analytics():

    initialize_analytics()

    try:

        with open(
            ANALYTICS_FILE,
            "r",
            encoding="utf-8"
        ) as file:

            data = json.load(file)

        if isinstance(data, list):

            # --------------------------------------------------------
            # M4.1 DATA CLEANUP
            #
            # Clarification requests are NOT knowledge gaps.
            # Clean older records that were incorrectly marked.
            # --------------------------------------------------------

            data_changed = False

            for item in data:

                if not isinstance(item, dict):
                    continue

                if item.get("needs_clarification") is True:

                    if item.get("knowledge_gap") is not False:
                        item["knowledge_gap"] = False
                        data_changed = True

                    if item.get("low_confidence") is not False:
                        item["low_confidence"] = False
                        data_changed = True

                    if item.get("weak_retrieval") is not False:
                        item["weak_retrieval"] = False
                        data_changed = True

            if data_changed:

                with open(
                    ANALYTICS_FILE,
                    "w",
                    encoding="utf-8"
                ) as file:

                    json.dump(
                        data,
                        file,
                        indent=4
                    )

            return data

        return []

    except (json.JSONDecodeError, FileNotFoundError):

        return []

    except Exception as e:

        print(
            f"Analytics loading error: {e}"
        )

        return []

# ============================================================
# SAVE ANALYTICS
# ============================================================

def save_analytics(data):

    with open(
        ANALYTICS_FILE,
        "w",
        encoding="utf-8"
    ) as file:

        json.dump(
            data,
            file,
            indent=4
        )


# ============================================================
# RECORD QUERY
# ============================================================

def record_query(
    query,
    query_type="unknown",
    confidence=0.0,
    answered=False,
    needs_clarification=False,
    retrieved_documents=None,
    relevance_distances=None,
    knowledge_gap=False,
    domain="unknown",
    response_status="unknown",
    response_time=0.0,
    retrieval_confidence=0.0
):

    analytics = load_analytics()

    retrieved_documents = (
        retrieved_documents
        if retrieved_documents
        else []
    )

    relevance_distances = (
        relevance_distances
        if relevance_distances
        else []
    )

    # --------------------------------------------------------
    # Confidence
    # --------------------------------------------------------

    try:

        confidence = float(
            confidence
        )

    except (
        TypeError,
        ValueError
    ):

        confidence = 0.0

    try:

        retrieval_confidence = float(
            retrieval_confidence
        )

    except (
        TypeError,
        ValueError
    ):

        retrieval_confidence = 0.0

    # --------------------------------------------------------
    # Response time
    # --------------------------------------------------------

    try:

        response_time = float(
            response_time
        )

    except (
        TypeError,
        ValueError
    ):

        response_time = 0.0

    if response_time < 0:

        response_time = 0.0

    # --------------------------------------------------------
    # Low confidence
    #
    # Clarification is NOT treated as low confidence.
    # --------------------------------------------------------

    if needs_clarification:

        low_confidence = False

    else:

        low_confidence = (
            confidence
            < LOW_CONFIDENCE_THRESHOLD
        )

    # --------------------------------------------------------
    # Weak retrieval
    # --------------------------------------------------------

    weak_retrieval = False

    if (
        relevance_distances
        and not needs_clarification
    ):

        valid_distances = []

        for distance in relevance_distances:

            try:

                valid_distances.append(
                    float(distance)
                )

            except (
                TypeError,
                ValueError
            ):

                pass

        if valid_distances:

            weak_retrieval = all(
                distance > HIGH_DISTANCE_THRESHOLD
                for distance in valid_distances
            )

    # --------------------------------------------------------
    # Knowledge gap detection
    #
    # A clarification request is NEVER a knowledge gap.
    #
    # A knowledge gap means:
    # - system could not answer
    # - clarification was not required
    # - knowledge was unavailable/insufficient
    #
    # Weak retrieval alone can indicate insufficient knowledge.
    # --------------------------------------------------------

    if needs_clarification:

        detected_knowledge_gap = False

    elif answered:

        detected_knowledge_gap = False

    else:

        detected_knowledge_gap = (
            bool(knowledge_gap)
            or weak_retrieval
        )

    # --------------------------------------------------------
    # Retrieval information
    # --------------------------------------------------------

    retrieval_count = len(
        retrieved_documents
    )

    best_distance = None

    if relevance_distances:

        try:

            best_distance = min(
                float(distance)
                for distance in relevance_distances
            )

        except (
            TypeError,
            ValueError
        ):

            best_distance = None

    # --------------------------------------------------------
    # Create analytics record
    # --------------------------------------------------------

    record = {

        "timestamp":
            datetime.now().isoformat(),

        "query":
            query,

        "query_type":
            query_type,

        "domain":
            domain,

        "confidence":
            confidence,

        "retrieval_confidence":
            retrieval_confidence,

        "low_confidence":
            low_confidence,

        "answered":
            bool(answered),

        "response_status":
            response_status,

        "needs_clarification":
            bool(needs_clarification),

        "retrieved_documents":
            retrieved_documents,

        "retrieval_count":
            retrieval_count,

        "relevance_distances":
            relevance_distances,

        "best_retrieval_distance":
            best_distance,

        "weak_retrieval":
            weak_retrieval,

        "knowledge_gap":
            detected_knowledge_gap,

        "response_time":
            round(
                response_time,
                4
            )
    }

    analytics.append(
        record
    )

    save_analytics(
        analytics
    )


# ============================================================
# GET ALL ANALYTICS
# ============================================================

def get_analytics():

    return load_analytics()


# ============================================================
# CLEAR ANALYTICS
# ============================================================

def clear_analytics():

    save_analytics([])


# ============================================================
# ANALYTICS SUMMARY
# ============================================================

def get_analytics_summary():

    analytics = load_analytics()

    total_queries = len(
        analytics
    )

    answered_queries = sum(
        1
        for item in analytics
        if item.get("answered") is True
    )

    clarification_queries = sum(
        1
        for item in analytics
        if item.get(
            "needs_clarification"
        ) is True
    )

    unanswered_queries = sum(
        1
        for item in analytics
        if (
            item.get("answered") is not True
            and item.get("needs_clarification") is not True
        )
    )

    knowledge_gaps = sum(
        1
        for item in analytics
        if (
            item.get("knowledge_gap") is True
            and item.get("needs_clarification") is not True
        )
    )

    low_confidence_queries = sum(
        1
        for item in analytics
        if (
            item.get("low_confidence") is True
            and item.get("needs_clarification") is not True
        )
    )

    weak_retrieval_queries = sum(
        1
        for item in analytics
        if (
            item.get("weak_retrieval") is True
            and item.get("needs_clarification") is not True
        )
    )

    # --------------------------------------------------------
    # Average confidence
    #
    # Clarification queries are excluded because they do not
    # represent a completed answer.
    # --------------------------------------------------------

    confidence_values = []

    for item in analytics:

        if item.get(
            "needs_clarification"
        ) is True:

            continue

        try:

            confidence_values.append(
                float(
                    item.get(
                        "confidence",
                        0.0
                    )
                )
            )

        except (
            TypeError,
            ValueError
        ):

            pass

    if confidence_values:

        average_confidence = (
            sum(confidence_values)
            / len(confidence_values)
        )

    else:

        average_confidence = 0.0

    # --------------------------------------------------------
    # Average response time
    # --------------------------------------------------------

    response_times = []

    for item in analytics:

        try:

            response_time = float(
                item.get(
                    "response_time",
                    0.0
                )
            )

            if response_time >= 0:

                response_times.append(
                    response_time
                )

        except (
            TypeError,
            ValueError
        ):

            pass

    if response_times:

        average_response_time = (
            sum(response_times)
            / len(response_times)
        )

    else:

        average_response_time = 0.0

    # --------------------------------------------------------
    # Answer rate
    # --------------------------------------------------------

    if total_queries > 0:

        answer_rate = (
            answered_queries
            / total_queries
        ) * 100

    else:

        answer_rate = 0.0

    return {

        "total_queries":
            total_queries,

        "answered_queries":
            answered_queries,

        "unanswered_queries":
            unanswered_queries,

        "clarification_queries":
            clarification_queries,

        "knowledge_gaps":
            knowledge_gaps,

        "low_confidence_queries":
            low_confidence_queries,

        "weak_retrieval_queries":
            weak_retrieval_queries,

        "average_confidence":
            round(
                average_confidence,
                3
            ),

        "average_response_time":
            round(
                average_response_time,
                3
            ),

        "answer_rate":
            round(
                answer_rate,
                2
            )
    }


# ============================================================
# QUERY TYPE ANALYTICS
# ============================================================

def get_query_type_statistics():

    analytics = load_analytics()

    counter = Counter()

    for item in analytics:

        query_type = item.get(
            "query_type",
            "unknown"
        )

        counter[
            query_type
        ] += 1

    return dict(counter)


# ============================================================
# DOMAIN ANALYTICS
# ============================================================

def get_domain_statistics():

    analytics = load_analytics()

    counter = Counter()

    for item in analytics:

        domain = item.get(
            "domain",
            "unknown"
        )

        if domain and domain.lower() != "unknown":

            counter[
                domain
            ] += 1

            continue

        documents = item.get(
            "retrieved_documents",
            []
        )

        detected_domains = set()

        for document in documents:

            document_name = str(
                document
            ).lower()

            if any(keyword in document_name for keyword in [
                "ai",
                "artificial",
                "machine",
                "learning",
                "deep",
                "neural"
            ]):

                detected_domains.add(
                    "Artificial Intelligence"
                )

            elif any(keyword in document_name for keyword in [
                "agriculture",
                "agri",
                "soil",
                "farm",
                "irrigation",
                "greenhouse"
            ]):

                detected_domains.add(
                    "Agriculture / IoT"
                )

            elif any(keyword in document_name for keyword in [
                "nlp",
                "natural",
                "language",
                "text"
            ]):

                detected_domains.add(
                    "NLP"
                )

            elif any(keyword in document_name for keyword in [
                "crypto",
                "cryptography",
                "cipher",
                "encryption"
            ]):

                detected_domains.add(
                    "Cryptography"
                )

            elif any(keyword in document_name for keyword in [
                "sensor",
                "instrument",
                "transducer",
                "instrumentation"
            ]):

                detected_domains.add(
                    "Sensors / Instrumentation"
                )

        if detected_domains:

            for detected_domain in detected_domains:

                counter[
                    detected_domain
                ] += 1

        else:

            counter[
                "Unknown"
            ] += 1

    return dict(counter)


# ============================================================
# COMMON / REPEATED QUERIES
# ============================================================

def get_common_queries(
    limit=10
):

    analytics = load_analytics()

    counter = Counter()

    for item in analytics:

        query = str(
            item.get(
                "query",
                ""
            )
        ).strip().lower()

        if query:

            counter[
                query
            ] += 1

    common_queries = []

    for query, count in counter.most_common(
        limit
    ):

        common_queries.append({

            "query":
                query,

            "count":
                count
        })

    return common_queries


# ============================================================
# LOW CONFIDENCE QUERIES
# ============================================================

def get_low_confidence_queries():

    analytics = load_analytics()

    low_confidence_queries = []

    for item in analytics:

        # Clarification is not low confidence
        if item.get(
            "needs_clarification"
        ) is True:

            continue

        confidence = item.get(
            "confidence",
            0.0
        )

        try:

            confidence = float(
                confidence
            )

        except (
            TypeError,
            ValueError
        ):

            confidence = 0.0

        if (
            confidence
            < LOW_CONFIDENCE_THRESHOLD
        ):

            low_confidence_queries.append({

                "query":
                    item.get(
                        "query",
                        ""
                    ),

                "query_type":
                    item.get(
                        "query_type",
                        "unknown"
                    ),

                "domain":
                    item.get(
                        "domain",
                        "unknown"
                    ),

                "confidence":
                    confidence,

                "timestamp":
                    item.get(
                        "timestamp",
                        ""
                    )
            })

    return low_confidence_queries


# ============================================================
# KNOWLEDGE GAP DETECTION
# ============================================================

def detect_knowledge_gaps():

    analytics = load_analytics()

    gaps = []

    for item in analytics:

        # Never classify clarification as a knowledge gap
        if item.get(
            "needs_clarification"
        ) is True:

            continue

        # Answered query is not a knowledge gap
        if item.get(
            "answered"
        ) is True:

            continue

        # Only genuine knowledge gaps
        if item.get(
            "knowledge_gap"
        ) is not True:

            continue

        gaps.append({

            "query":
                item.get(
                    "query",
                    ""
                ),

            "query_type":
                item.get(
                    "query_type",
                    "unknown"
                ),

            "domain":
                item.get(
                    "domain",
                    "unknown"
                ),

            "confidence":
                item.get(
                    "confidence",
                    0.0
                ),

            "answered":
                item.get(
                    "answered",
                    False
                ),

            "retrieved_documents":
                item.get(
                    "retrieved_documents",
                    []
                ),

            "relevance_distances":
                item.get(
                    "relevance_distances",
                    []
                ),

            "timestamp":
                item.get(
                    "timestamp",
                    ""
                )
        })

    return gaps


# ============================================================
# RETRIEVAL ANALYTICS
# ============================================================

def get_retrieval_statistics():

    analytics = load_analytics()

    total_retrievals = 0

    distances = []

    for item in analytics:

        documents = item.get(
            "retrieved_documents",
            []
        )

        total_retrievals += len(
            documents
        )

        for distance in item.get(
            "relevance_distances",
            []
        ):

            try:

                distances.append(
                    float(distance)
                )

            except (
                TypeError,
                ValueError
            ):

                pass

    if distances:

        average_distance = (
            sum(distances)
            / len(distances)
        )

        best_distance = min(
            distances
        )

        worst_distance = max(
            distances
        )

    else:

        average_distance = 0.0
        best_distance = None
        worst_distance = None

    return {

        "total_retrieved_documents":
            total_retrievals,

        "average_retrieval_distance":
            round(
                average_distance,
                4
            ),

        "best_retrieval_distance":
            best_distance,

        "worst_retrieval_distance":
            worst_distance
    }


# ============================================================
# DATE FILTERING
# ============================================================

def get_analytics_by_date(
    start_date=None,
    end_date=None
):

    analytics = load_analytics()

    filtered = []

    for item in analytics:

        timestamp = item.get(
            "timestamp",
            ""
        )

        try:

            record_date = datetime.fromisoformat(
                timestamp
            ).date()

        except (
            ValueError,
            TypeError
        ):

            continue

        if start_date:

            if isinstance(
                start_date,
                str
            ):

                start_date_value = (
                    datetime.fromisoformat(
                        start_date
                    ).date()
                )

            else:

                start_date_value = start_date

            if record_date < start_date_value:

                continue

        if end_date:

            if isinstance(
                end_date,
                str
            ):

                end_date_value = (
                    datetime.fromisoformat(
                        end_date
                    ).date()
                )

            else:

                end_date_value = end_date

            if record_date > end_date_value:

                continue

        filtered.append(
            item
        )

    return filtered


# ============================================================
# DAILY QUERY STATISTICS
# ============================================================

def get_daily_statistics():

    analytics = load_analytics()

    daily = {}

    for item in analytics:

        timestamp = item.get(
            "timestamp",
            ""
        )

        try:

            date = datetime.fromisoformat(
                timestamp
            ).date().isoformat()

        except (
            ValueError,
            TypeError
        ):

            continue

        if date not in daily:

            daily[date] = {

                "total_queries": 0,

                "answered_queries": 0,

                "unanswered_queries": 0,

                "knowledge_gaps": 0,

                "clarifications": 0,

                "average_response_time": 0.0
            }

        daily[date][
            "total_queries"
        ] += 1

        if item.get(
            "answered"
        ) is True:

            daily[date][
                "answered_queries"
            ] += 1

        elif item.get(
            "needs_clarification"
        ) is not True:

            daily[date][
                "unanswered_queries"
            ] += 1

        if (
            item.get("knowledge_gap") is True
            and item.get("answered") is not True
            and item.get("needs_clarification") is not True
        ):

            daily[date][
                "knowledge_gaps"
            ] += 1

        if item.get(
            "needs_clarification"
        ) is True:

            daily[date][
                "clarifications"
            ] += 1

    # --------------------------------------------------------
    # Calculate daily average response time
    # --------------------------------------------------------

    for date in daily:

        day_records = [

            item

            for item in analytics

            if item.get(
                "timestamp",
                ""
            ).startswith(date)
        ]

        times = []

        for item in day_records:

            try:

                times.append(
                    float(
                        item.get(
                            "response_time",
                            0.0
                        )
                    )
                )

            except (
                TypeError,
                ValueError
            ):

                pass

        if times:

            daily[date][
                "average_response_time"
            ] = round(
                sum(times) / len(times),
                3
            )

    return daily


# ============================================================
# COMPLETE M4.1 ANALYTICS REPORT
# ============================================================

def get_analytics_report():

    return {

        "summary":
            get_analytics_summary(),

        "query_type_statistics":
            get_query_type_statistics(),

        "domain_statistics":
            get_domain_statistics(),

        "common_queries":
            get_common_queries(),

        "low_confidence_queries":
            get_low_confidence_queries(),

        "knowledge_gaps":
            detect_knowledge_gaps(),

        "retrieval_statistics":
            get_retrieval_statistics(),

        "daily_statistics":
            get_daily_statistics()
    }