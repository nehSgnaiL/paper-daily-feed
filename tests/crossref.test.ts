import { describe, expect, it, mock } from "bun:test";
import { fetchCrossrefJournalWorks, fetchCrossrefWork, findDoi } from "../src/crossref.js";

describe("Crossref metadata", () => {
  it("retrieves recent works for a journal ISSN", async () => {
    const fetcher = mock(async (_input: string | URL | Request) =>
      new Response(
        JSON.stringify({
          message: {
            items: [
              {
                DOI: "10.1080/example",
                title: ["Recent journal paper"],
                URL: "https://doi.org/10.1080/example",
                issued: { "date-parts": [[2026, 7, 1]] }
              }
            ]
          }
        }),
        { status: 200 }
      )
    );

    const works = await fetchCrossrefJournalWorks("2469-4460", { fetcher });

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(String(fetcher.mock.calls[0]?.[0])).toContain("journals/2469-4460/works");
    expect(works).toMatchObject([{ doi: "10.1080/example", title: "Recent journal paper" }]);
  });

  it("extracts DOI values from publisher URLs and text", () => {
    expect(findDoi("https://www.tandfonline.com/doi/full/10.1080/24694452.2025.2592754?af=R")).toBe(
      "10.1080/24694452.2025.2592754"
    );
    expect(findDoi("DOI: 10.1016/j.cities.2026.105952.")).toBe("10.1016/j.cities.2026.105952");
  });

  it("normalizes Crossref work metadata from DOI lookup responses", async () => {
    const fetcher = mock(async () =>
      new Response(
        JSON.stringify({
          message: {
            DOI: "10.1080/24694452.2025.2592754",
            title: ["Crossref title"],
            abstract: "<jats:p>Crossref abstract with <i>markup</i>.</jats:p>",
            author: [
              { given: "Ada", family: "Lovelace" },
              { name: "Open Research Group" }
            ],
            "container-title": ["Annals of the American Association of Geographers"],
            "published-print": { "date-parts": [[2026, 4, 21]] },
            URL: "https://doi.org/10.1080/24694452.2025.2592754"
          }
        }),
        {
          headers: { "Content-Type": "application/json" }
        }
      )
    );

    const metadata = await fetchCrossrefWork("10.1080/24694452.2025.2592754", { fetcher });

    expect(fetcher).toHaveBeenCalledWith(
      "https://api.crossref.org/works/10.1080%2F24694452.2025.2592754",
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: "application/json"
        })
      })
    );
    expect(metadata).toEqual({
      doi: "10.1080/24694452.2025.2592754",
      title: "Crossref title",
      abstract: "Crossref abstract with markup.",
      authors: ["Ada Lovelace", "Open Research Group"],
      journal: "Annals of the American Association of Geographers",
      publishedAt: new Date("2026-04-21T00:00:00.000Z"),
      url: "https://doi.org/10.1080/24694452.2025.2592754"
    });
  });
});
