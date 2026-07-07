/**
 * Journal Data
 * 
 * This file contains all journal data for the subscription.
 * Edit this file to add, remove, or update journals.
 */

// journal data structure
type Journal = {
  name: string;
  abbr?: string;
  rss: string;
  issn?: string;
};

// stored data
const journals: Journal[] = [
  {
    name: "Nature",
    abbr: "Nature",
    rss: "https://www.nature.com/nature.rss"
  },
  {
    name: "Science",
    abbr: "Science",
    rss: "https://www.science.org/action/showFeed?type=etoc&feed=rss&jc=science"
  },
  {
    name: "Proceedings of the National Academy of Sciences",
    abbr: "PNAS",
    rss: "https://www.pnas.org/action/showFeed?type=etoc&feed=rss&jc=PNAS"
  },
  {
    name: "Nature Cities",
    rss: "https://www.nature.com/natcities.rss",
  },
  {
    name: "Nature Climate Change",
    rss: "https://www.nature.com/nclimate.rss"
  },
  {
    name: "Nature Communications",
    rss: "https://www.nature.com/ncomms.rss"
  },
  {
    name: "Nature Computational Science",
    rss: "https://www.nature.com/natcomputsci.rss"
  },
  {
    name: "Nature Geoscience",
    rss: "https://www.nature.com/ngeo.rss"
  },
  {
    name: "Nature Health",
    rss: "https://www.nature.com/naturehealth.rss"
  },
  {
    name: "Nature Human Behaviour",
    rss: "https://www.nature.com/nathumbehav.rss"
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
    rss: "https://rss.sciencedirect.com/publication/science/01989715"
  },
  {
    name: "Travel Behaviour and Society",
    abbr: "TBS",
    rss: "https://rss.sciencedirect.com/publication/science/2214367X"
  },
  {
    name: "International Journal of Geographical Information Science",
    abbr: "IJGIS",
    rss: "https://www.tandfonline.com/feed/rss/tgis20",
    issn: "1365-8816"
  },
  {
    name: "Cities",
    rss: "https://rss.sciencedirect.com/publication/science/02642751"
  },
  {
    name: "Journal of Transport Geography",
    abbr: "JTG",
    rss: "https://rss.sciencedirect.com/publication/science/09666923"
  },
  {
    name: "Applied Geography",
    rss: "https://rss.sciencedirect.com/publication/science/01436228"
  },
  {
    name: "Landscape and Urban Planning",
    rss: "https://rss.sciencedirect.com/publication/science/01692046"
  },
  {
    name: "Journal of The Royal Society Interface",
    rss: "https://royalsocietypublishing.org/rss/site_1000019/LatestOpenIssueArticles_1000012.xml"
  },
  {
    name: "Habitat International",
    rss: "https://rss.sciencedirect.com/publication/science/01973975"
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
    rss: "https://www.nature.com/npjurbansustain.rss"
  },
  {
    name: "Transportation Research Part C: Emerging Technologies",
    abbr: "TR_C",
    rss: "https://rss.sciencedirect.com/publication/science/0968090X",
  },
  {
    name: "Transportation Research Part A: Policy and Practice",
    abbr: "TR_A",
    rss: "https://rss.sciencedirect.com/publication/science/09658564"
  },
  {
    name: "IEEE Transactions on Intelligent Transportation Systems",
    abbr: "IEEE T-ITS",
    rss: "https://ieeexplore.ieee.org/rss/TOC6979.XML"
  },
  {
    name: "IEEE Transactions on Geoscience and Remote Sensing",
    abbr: "IEEE TGRS",
    rss: "https://ieeexplore.ieee.org/rss/TOC36.XML"
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
    rss: "https://rss.sciencedirect.com/publication/science/22106707"
  },
  {
    name: "ISPRS Journal of Photogrammetry and Remote Sensing",
    abbr: "ISPRS P&RS",
    rss: "https://rss.sciencedirect.com/publication/science/09242716"
  },
  {
    name: "International Journal of Applied Earth Observation and Geoinformation",
    abbr: "JAG",
    rss: "https://rss.sciencedirect.com/publication/science/15698432"
  },
  {
    name: "Remote Sensing of Environment",
    abbr: "RSE",
    rss: "https://rss.sciencedirect.com/publication/science/00344257"
  },
  {
    name: "Scientific Data",
    rss: "https://www.nature.com/sdata.rss"
  }
];

export default journals;
