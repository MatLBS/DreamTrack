import httpx

from ai_watch.fetch import HiringCafeClient

SEARCH_LOCATION_RESPONSE = [
    {"label": "Paris, TX, US", "placeDetail": {"formatted_address": "Paris, TX, US", "population": 24782}},
    {"label": "Paris, TN, US", "placeDetail": {"formatted_address": "Paris, TN, US", "population": 10150}},
    {
        "label": "Paris, Île-de-France, FR",
        "placeDetail": {"formatted_address": "Paris, Île-de-France, FR", "population": 2138551},
    },
]


def _client_with_transport(handler) -> HiringCafeClient:
    http_client = httpx.Client(base_url="https://hiringcafe.com", transport=httpx.MockTransport(handler))
    return HiringCafeClient(http_client=http_client)


def test_resolve_location_picks_the_most_populous_candidate():
    # The endpoint's own ranking is not population-based (measured: a bare "Paris"
    # query ranks small US towns above the real Paris, FR) — the client must not
    # just trust result order.
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.params["query"] == "Paris"
        return httpx.Response(200, json=SEARCH_LOCATION_RESPONSE)

    client = _client_with_transport(handler)

    place = client.resolve_location("Paris")

    assert place["formatted_address"] == "Paris, Île-de-France, FR"


def test_resolve_location_returns_none_when_no_match():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json=[])

    client = _client_with_transport(handler)

    assert client.resolve_location("Atlantis") is None


def test_build_id_extracted_from_homepage():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, text='<script>{"buildId":"abc123"}</script>')

    client = _client_with_transport(handler)

    assert client.build_id() == "abc123"


def test_search_returns_ssr_hits():
    def handler(request: httpx.Request) -> httpx.Response:
        assert "/_next/data/build-1/index.json" in str(request.url)
        return httpx.Response(200, json={"pageProps": {"ssrHits": [{"id": "a"}]}})

    client = _client_with_transport(handler)

    hits = client.search("build-1", {"searchQuery": "Data Scientist"})

    assert hits == [{"id": "a"}]
