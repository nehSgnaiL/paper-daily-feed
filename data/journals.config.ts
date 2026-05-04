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
    rss: "https://www.tandfonline.com/feed/rss/raag21"
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
    rss: "https://www.tandfonline.com/feed/rss/tgis20"
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
    name: "IEEE Transactions on Intelligent Transportation Systems",
    abbr: "IEEE T-ITS",
    rss: "https://ieeexplore.ieee.org/rss/TOC6979.XML"
  }
];

export default journals;
