/**
 * Journal Data
 * 
 * This file contains all journal data for the subscription.
 * Edit this file to add, remove, or update journals.
 */

// journal data structure
type Journal = {
  name: string;  // full name of the journal
  abbr?: string;  // abbreviation of the journal (optional)
  rss: string;  // RSS feed URL of the journal
  issn?: string;  // ISSN of the journal (optional)
};

// stored data
const journals: Journal[] = [
  {
    name: "Nature",
    abbr: "Nature",
    rss: "https://www.nature.com/nature.rss",
    issn: "1476-4687"
  },
  {
    name: "Science",
    abbr: "Science",
    rss: "https://www.science.org/action/showFeed?type=etoc&feed=rss&jc=science",
    issn: "1095-9203"
  },
  {
    name: "Proceedings of the National Academy of Sciences",
    abbr: "PNAS",
    rss: "https://www.pnas.org/action/showFeed?type=etoc&feed=rss&jc=PNAS",
    issn: "1091-6490"
  },
  {
    name: "Nature Cities",
    rss: "https://www.nature.com/natcities.rss",
    issn: "2731-9997"
  },
  {
    name: "Nature Climate Change",
    rss: "https://www.nature.com/nclimate.rss",
    issn: "1758-6798"
  },
  {
    name: "Nature Communications",
    rss: "https://www.nature.com/ncomms.rss",
    issn: "2041-1723"
  },
  {
    name: "Nature Computational Science",
    rss: "https://www.nature.com/natcomputsci.rss",
    issn: "2662-8457"
  },
  {
    name: "Nature Geoscience",
    rss: "https://www.nature.com/ngeo.rss",
    issn: "1752-0908"
  },
  {
    name: "Nature Health",
    rss: "https://www.nature.com/naturehealth.rss",
    issn: "3005-0693"
  },
  {
    name: "Nature Human Behaviour",
    rss: "https://www.nature.com/nathumbehav.rss",
    issn: "2397-3374"
  },
  {
    name: "Annals of the American Association of Geographers",
    abbr: "AAAG",
    rss: "https://www.tandfonline.com/feed/rss/raag21",
    issn: "2469-4460"
  },
  {
    name: "Computers, Environment and Urban Systems",
    abbr: "CEUS",
    rss: "https://rss.sciencedirect.com/publication/science/01989715",
    issn: "0198-9715"
  },
  {
    name: "Travel Behaviour and Society",
    abbr: "TBS",
    rss: "https://rss.sciencedirect.com/publication/science/2214367X",
    issn: "2214-367X"
  },
  {
    name: "International Journal of Geographical Information Science",
    abbr: "IJGIS",
    rss: "https://www.tandfonline.com/feed/rss/tgis20",
    issn: "1365-8816"
  },
  {
    name: "Cities",
    rss: "https://rss.sciencedirect.com/publication/science/02642751",
    issn: "0264-2751"
  },
  {
    name: "Journal of Transport Geography",
    abbr: "JTG",
    rss: "https://rss.sciencedirect.com/publication/science/09666923",
    issn: "0966-6923"
  },
  {
    name: "Applied Geography",
    rss: "https://rss.sciencedirect.com/publication/science/01436228",
    issn: "0143-6228"
  },
  {
    name: "Landscape and Urban Planning",
    rss: "https://rss.sciencedirect.com/publication/science/01692046",
    issn: "0169-2046"
  },
  {
    name: "Journal of The Royal Society Interface",
    rss: "https://royalsocietypublishing.org/rss/site_1000019/LatestOpenIssueArticles_1000012.xml",
    issn: "1742-5662"
  },
  {
    name: "Habitat International",
    rss: "https://rss.sciencedirect.com/publication/science/01973975",
    issn: "0197-3975"
  },
  {
    name: "Urban Geography",
    rss: "https://www.tandfonline.com/feed/rss/rurb20",
    issn: "1938-2847"
  },
  {
    name: "Economic Geography",
    rss: "https://www.tandfonline.com/feed/rss/recg20",
    issn: "1944-8287"
  },
  {
    name: "npj Urban Sustainability",
    rss: "https://www.nature.com/npjurbansustain.rss",
    issn: "2661-8001"
  },
  {
    name: "Transportation Research Part C: Emerging Technologies",
    abbr: "TR_C",
    rss: "https://rss.sciencedirect.com/publication/science/0968090X",
    issn: "0968-090X"
  },
  {
    name: "Transportation Research Part A: Policy and Practice",
    abbr: "TR_A",
    rss: "https://rss.sciencedirect.com/publication/science/09658564",
    issn: "0965-8564"
  },
  {
    name: "IEEE Transactions on Intelligent Transportation Systems",
    abbr: "IEEE T-ITS",
    rss: "https://ieeexplore.ieee.org/rss/TOC6979.XML",
    issn: "1524-9050"
  },
  {
    name: "IEEE Transactions on Geoscience and Remote Sensing",
    abbr: "IEEE TGRS",
    rss: "https://ieeexplore.ieee.org/rss/TOC36.XML",
    issn: "1558-0644"
  },
  {
    name: "International Journal of Digital Earth",
    abbr: "IJDE",
    rss: "https://www.tandfonline.com/feed/rss/tjde20",
    issn: "1753-8955"
  },
  {
    name: "Sustainable Cities and Society",
    abbr: "SCS",
    rss: "https://rss.sciencedirect.com/publication/science/22106707",
    issn: "2210-6707"
  },
  {
    name: "ISPRS Journal of Photogrammetry and Remote Sensing",
    abbr: "ISPRS P&RS",
    rss: "https://rss.sciencedirect.com/publication/science/09242716",
    issn: "0924-2716"
  },
  {
    name: "International Journal of Applied Earth Observation and Geoinformation",
    abbr: "JAG",
    rss: "https://rss.sciencedirect.com/publication/science/15698432",
    issn: "1569-8432"
  },
  {
    name: "Remote Sensing of Environment",
    abbr: "RSE",
    rss: "https://rss.sciencedirect.com/publication/science/00344257",
    issn: "0034-4257"
  },
  {
    name: "Scientific Data",
    rss: "https://www.nature.com/sdata.rss",
    issn: "2052-4463"
  }
];

export default journals;
