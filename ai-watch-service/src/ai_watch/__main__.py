"""CLI et serveur AI Watch.

Commandes :
    fetch  : Test manuel — fetch réel hiring.cafe et affichage/persistance
    serve  : Démarre le serveur FastAPI HTTP

Usage :
    uv run python -m ai_watch fetch --positions "Data Scientist" --locations "Paris"
    uv run python -m ai_watch serve --host 127.0.0.1 --port 8000 --reload
"""

from __future__ import annotations

import argparse
import dataclasses
import json
from pathlib import Path

from .fetch import HiringCafeClient, build_search_state, fetch_offers


def create_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    subparsers = parser.add_subparsers(dest="command", required=True)

    # Commande fetch (CLI existant)
    fetch_parser = subparsers.add_parser("fetch", help="Fetch et affiche des offres (test CLI)")
    fetch_parser.add_argument(
        "--positions",
        action="append",
        required=True,
        help="Poste recherché (répétable — un fetch par poste)",
    )
    fetch_parser.add_argument(
        "--locations",
        action="append",
        default=[],
        help="Ville (répétable — couvertes en un seul fetch par poste)",
    )
    fetch_parser.add_argument("--max-per-position", type=int, default=15)
    fetch_parser.add_argument(
        "--output",
        type=Path,
        default=None,
        help="Écrit les offres normalisées et dédoublonnées (JSON) dans ce fichier",
    )
    fetch_parser.add_argument(
        "--capture",
        type=Path,
        default=None,
        help="Écrit les ssrHits bruts (1er poste, toutes les villes) dans ce fichier — fixture de test",
    )

    # Commande serve (nouveau)
    serve_parser = subparsers.add_parser("serve", help="Démarre le serveur FastAPI")
    serve_parser.add_argument("--host", default="127.0.0.1", help="Host à écouter")
    serve_parser.add_argument("--port", type=int, default=8000, help="Port à écouter")
    serve_parser.add_argument("--reload", action="store_true", help="Auto-reload en dev")

    return parser


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = create_parser()
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> None:
    args = parse_args(argv)

    if args.command == "serve":
        _run_server(args)
    elif args.command == "fetch":
        _run_fetch(args)


def _run_server(args: argparse.Namespace) -> None:
    """Démarre le serveur FastAPI."""
    import uvicorn

    uvicorn.run(
        "ai_watch.server:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
    )


def _run_fetch(args: argparse.Namespace) -> None:
    """Commande fetch (CLI de test)."""
    client = HiringCafeClient()

    if args.capture:
        _capture_raw_hits(client, args.positions[0], args.locations, args.max_per_position, args.capture)

    offers = fetch_offers(
        args.positions,
        locations=args.locations,
        max_per_position=args.max_per_position,
        client=client,
    )

    print(f"{len(offers)} offre(s) normalisée(s) et dédoublonnée(s) :")
    for offer in offers:
        print(f"- [{offer.source}] {offer.title} @ {offer.company_name} — {offer.apply_url}")

    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(
            json.dumps([dataclasses.asdict(o) for o in offers], indent=2, ensure_ascii=False)
        )
        print(f"{len(offers)} offre(s) écrite(s) dans {args.output}")


def _capture_raw_hits(
    client: HiringCafeClient,
    position: str,
    locations: list[str],
    max_items: int,
    capture_path: Path,
) -> None:
    resolved = []
    for location in locations:
        place = client.resolve_location(location)
        if place is not None:
            resolved.append(place)

    build_id = client.build_id()
    search_state = build_search_state(position, resolved)
    hits = client.search(build_id, search_state)[:max_items]

    capture_path.parent.mkdir(parents=True, exist_ok=True)
    capture_path.write_text(json.dumps(hits, indent=2, ensure_ascii=False))
    print(f"{len(hits)} item(s) brut(s) écrit(s) dans {capture_path}")


if __name__ == "__main__":
    main()
