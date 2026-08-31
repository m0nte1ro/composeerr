export type Album = {
  id: string;
  title: string;
  artist: string;
  year: number;
  type: string;
  artworkClass: string;
  tracks: string[];
};

export type Song = {
  id: string;
  title: string;
  artist: string;
  duration: string;
  firstRelease: number;
  albumIds: string[];
};

export type Artist = {
  id: string;
  name: string;
  description: string;
  formed?: number;
  location?: string;
  artworkClass: string;
  albumIds: string[];
};

export const albums: Album[] = [
  {
    id: "ok-computer",
    title: "OK Computer",
    artist: "Radiohead",
    year: 1997,
    type: "Original Album",
    artworkClass: "artwork-radiohead",
    tracks: [
      "Airbag",
      "Paranoid Android",
      "Subterranean Homesick Alien",
      "Exit Music (For a Film)",
      "Let Down",
      "Karma Police",
      "Fitter Happier",
      "Electioneering",
      "Climbing Up the Walls",
      "No Surprises",
      "Lucky",
      "The Tourist",
    ],
  },
  {
    id: "oknotok",
    title: "OK Computer OKNOTOK 1997 2017",
    artist: "Radiohead",
    year: 2017,
    type: "Remastered / Expanded",
    artworkClass: "artwork-oknotok",
    tracks: [
      "Airbag",
      "Paranoid Android",
      "Subterranean Homesick Alien",
      "Exit Music (For a Film)",
      "Let Down",
      "Karma Police",
      "No Surprises",
      "Lucky",
      "The Tourist",
      "I Promise",
      "Man of War",
      "Lift",
    ],
  },
  {
    id: "radiohead-best-of",
    title: "The Best Of",
    artist: "Radiohead",
    year: 2008,
    type: "Compilation",
    artworkClass: "artwork-bestof",
    tracks: [
      "Just",
      "Paranoid Android",
      "Karma Police",
      "Creep",
      "No Surprises",
      "High and Dry",
      "My Iron Lung",
      "There There",
      "Lucky",
      "Fake Plastic Trees",
      "Idioteque",
      "2 + 2 = 5",
      "The Bends",
      "Pyramid Song",
      "Street Spirit (Fade Out)",
      "Everything in Its Right Place",
    ],
  },
  {
    id: "swing-1964",
    title: "It Might as Well Be Swing",
    artist: "Frank Sinatra",
    year: 1964,
    type: "Original Album",
    artworkClass: "artwork-sinatra",
    tracks: [
      "Fly Me to the Moon",
      "I Wish You Love",
      "I Believe in You",
      "More",
      "I Can't Stop Loving You",
      "Hello, Dolly!",
      "I Wanna Be Around",
      "The Best Is Yet to Come",
      "The Good Life",
      "Wives and Lovers",
    ],
  },
  {
    id: "nothing-but-the-best",
    title: "Nothing but the Best",
    artist: "Frank Sinatra",
    year: 2008,
    type: "Compilation",
    artworkClass: "artwork-sinatra-best",
    tracks: [
      "Come Fly with Me",
      "The Best Is Yet to Come",
      "The Way You Look Tonight",
      "Luck Be a Lady",
      "Bewitched",
      "The Good Life",
      "The Girl from Ipanema",
      "Fly Me to the Moon",
      "Summer Wind",
      "Strangers in the Night",
      "Call Me Irresponsible",
      "Somethin' Stupid",
      "My Kind of Town",
      "It Was a Very Good Year",
      "That's Life",
      "Moonlight Serenade",
      "Nothing but the Best",
      "Drinking Again",
      "All My Tomorrows",
      "My Way",
    ],
  },
  {
    id: "ultimate-sinatra",
    title: "Ultimate Sinatra",
    artist: "Frank Sinatra",
    year: 2015,
    type: "Compilation",
    artworkClass: "artwork-ultimate",
    tracks: [
      "All or Nothing at All",
      "I'll Never Smile Again",
      "Saturday Night",
      "Nancy",
      "I've Got the World on a String",
      "Young at Heart",
      "In the Wee Small Hours of the Morning",
      "You Make Me Feel So Young",
      "Come Fly with Me",
      "The Way You Look Tonight",
      "Fly Me to the Moon",
      "Strangers in the Night",
      "That's Life",
      "My Way",
      "Theme from New York, New York",
    ],
  },
];

export const songs: Song[] = [
  {
    id: "let-down-radiohead",
    title: "Let Down",
    artist: "Radiohead",
    duration: "4:59",
    firstRelease: 1997,
    albumIds: ["ok-computer", "oknotok", "radiohead-best-of"],
  },
  {
    id: "fly-me-to-the-moon-sinatra",
    title: "Fly Me to the Moon",
    artist: "Frank Sinatra",
    duration: "2:30",
    firstRelease: 1964,
    albumIds: ["swing-1964", "nothing-but-the-best", "ultimate-sinatra"],
  },
  {
    id: "fly-me-to-the-moon-tony",
    title: "Fly Me to the Moon",
    artist: "Tony Bennett",
    duration: "4:01",
    firstRelease: 1965,
    albumIds: [],
  },
  {
    id: "dont-let-me-down",
    title: "Don't Let Me Down",
    artist: "The Beatles",
    duration: "3:35",
    firstRelease: 1969,
    albumIds: [],
  },
];

export const artists: Artist[] = [
  {
    id: "radiohead",
    name: "Radiohead",
    description: "English alternative rock band.",
    formed: 1985,
    location: "Abingdon, Oxfordshire",
    artworkClass: "artist-radiohead",
    albumIds: ["ok-computer", "oknotok", "radiohead-best-of"],
  },
  {
    id: "frank-sinatra",
    name: "Frank Sinatra",
    description: "American singer and actor.",
    location: "Hoboken, New Jersey",
    artworkClass: "artist-sinatra",
    albumIds: [
      "swing-1964",
      "nothing-but-the-best",
      "ultimate-sinatra",
    ],
  },
];