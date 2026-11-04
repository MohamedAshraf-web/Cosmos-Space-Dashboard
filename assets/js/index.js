// ============================================
// COSMOS Space Dashboard
// ============================================

// ---------- Settings ----------
const apiKey = "DEMO_KEY"; // put your own NASA key here (api.nasa.gov)
const apodUrl = "https://api.nasa.gov/planetary/apod";
const launchesUrl = "https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=10";
const planetsUrl = "https://solar-system-opendata-proxy.vercel.app/api/planets";

// planet colors (taken from the design)
const planetStyles = {
  mercury: { color: "#eab308", badge: "bg-orange-500/50 text-orange-200" },
  venus: { color: "#f97316", badge: "bg-orange-500/50 text-orange-200" },
  earth: { color: "#3b82f6", badge: "bg-blue-500/50 text-blue-200" },
  mars: { color: "#ef4444", badge: "bg-red-500/50 text-red-200" },
  jupiter: { color: "#fb923c", badge: "bg-purple-500/50 text-purple-200" },
  saturn: { color: "#facc15", badge: "bg-yellow-500/50 text-yellow-200" },
  uranus: { color: "#06b6d4", badge: "bg-cyan-500/50 text-cyan-200" },
  neptune: { color: "#2563eb", badge: "bg-blue-500/50 text-blue-200" },
};

let planets = []; // we save the planets here after fetching them

// small helper: put text inside an element by its id
function setText(id, text) {
  document.getElementById(id).textContent = text;
}

// ============================================
// Sidebar + switching between sections
// ============================================
const sections = document.querySelectorAll(".app-section");
const navLinks = document.querySelectorAll(".nav-link");
const sidebar = document.getElementById("sidebar");

function showSection(name) {
  // show the chosen section and hide the others
  sections.forEach(function (section) {
    if (section.dataset.section === name) {
      section.classList.remove("hidden");
    } else {
      section.classList.add("hidden");
    }
  });

  // highlight the chosen link in the sidebar
  navLinks.forEach(function (link) {
    if (link.dataset.section === name) {
      link.classList.add("bg-blue-500/10", "text-blue-400");
      link.classList.remove("text-slate-300", "hover:bg-slate-800");
    } else {
      link.classList.remove("bg-blue-500/10", "text-blue-400");
      link.classList.add("text-slate-300", "hover:bg-slate-800");
    }
  });

  sidebar.classList.remove("sidebar-open"); // close the sidebar on mobile
  window.scrollTo(0, 0);
}

navLinks.forEach(function (link) {
  link.addEventListener("click", function (event) {
    event.preventDefault();
    showSection(link.dataset.section);
  });
});

document.getElementById("sidebar-toggle").addEventListener("click", function () {
  sidebar.classList.toggle("sidebar-open");
});

// ============================================
// 1) Today in Space (NASA APOD)
// ============================================
const dateInput = document.getElementById("apod-date-input");
const dateText = document.querySelector(".date-input-wrapper span");

function formatDate(dateString, monthType) {
  const date = new Date(dateString + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    month: monthType,
    day: "numeric",
    year: "numeric",
  });
}

function showApod(data) {
  const image = document.getElementById("apod-image");

  if (data.media_type === "image") {
    image.src = data.url;
  } else {
    // if today's APOD is a video we show its thumbnail
    image.src = data.thumbnail_url || "./assets/images/placeholder.webp";
  }

  setText("apod-date", "Astronomy Picture of the Day - " + formatDate(data.date, "long"));
  setText("apod-title", data.title);
  setText("apod-explanation", data.explanation);
  setText("apod-date-info", data.date);
  setText("apod-media-type", data.media_type === "image" ? "Image" : "Video");
  document.getElementById("apod-date-detail").innerHTML =
    '<i class="far fa-calendar mr-2"></i>' + data.date;

  if (data.copyright) {
    setText("apod-copyright", "© " + data.copyright.trim());
  } else {
    setText("apod-copyright", "Public domain - NASA");
  }

  dateInput.value = data.date;
  dateText.textContent = formatDate(data.date, "short");

  // the "View Full Resolution" button opens the big image
  document.querySelector("#apod-image-container button").onclick = function () {
    window.open(data.hdurl || data.url, "_blank");
  };
}

function loadApod(date) {
  let url = apodUrl + "?api_key=" + apiKey + "&thumbs=true";
  if (date) {
    url = url + "&date=" + date;
  }

  const loading = document.getElementById("apod-loading");
  loading.classList.remove("hidden");

  fetch(url)
    .then(function (response) {
      return response.json();
    })
    .then(function (data) {
      if (!data.title) {
        throw new Error("No picture found for this date");
      }
      showApod(data);
    })
    .catch(function (error) {
      setText("apod-title", "Could not load the picture");
      setText("apod-explanation", error.message);
      document.getElementById("apod-image").src = "./assets/images/placeholder.webp";
    })
    .finally(function () {
      loading.classList.add("hidden");
    });
}

// the user can't choose a date in the future
dateInput.max = new Date().toISOString().split("T")[0];

dateInput.addEventListener("change", function () {
  if (dateInput.value) {
    dateText.textContent = formatDate(dateInput.value, "short");
  }
});

document.getElementById("load-date-btn").addEventListener("click", function () {
  if (dateInput.value) {
    loadApod(dateInput.value);
  }
});

document.getElementById("today-apod-btn").addEventListener("click", function () {
  loadApod();
});

// ============================================
// 2) Launches (SpaceDevs)
// ============================================
const fallbackLaunchImage = "./assets/images/launch-placeholder.png";

function launchDate(dateString, monthType) {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: monthType,
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function launchTime(dateString) {
  const time = new Date(dateString).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "UTC",
  });
  return time + " UTC";
}

// color of the status badge (Go = green, TBC = yellow ...)
function statusColor(statusName) {
  if (statusName === "Go") return "#22c55e";
  if (statusName === "TBC") return "#eab308";
  if (statusName === "Hold") return "#f97316";
  return "#64748b";
}

// the API sometimes sends null for some fields, so we use fallbacks
function getLaunchInfo(launch) {
  const location = launch.pad && launch.pad.location ? launch.pad.location : null;
  return {
    name: launch.name,
    status: launch.status ? launch.status.abbrev : "TBD",
    provider: launch.launch_service_provider ? launch.launch_service_provider.name : "Unknown",
    rocket:
      launch.rocket && launch.rocket.configuration ? launch.rocket.configuration.name : "Unknown",
    location: location ? location.name : "Unknown location",
    country: location ? location.country_code : "N/A",
    image: launch.image || fallbackLaunchImage,
    description:
      launch.mission && launch.mission.description
        ? launch.mission.description
        : "No description available yet.",
    net: launch.net,
  };
}

function showFeaturedLaunch(launch) {
  const daysLeft = Math.max(0, Math.ceil((new Date(launch.net) - new Date()) / 86400000));
  const color = statusColor(launch.status);

  document.getElementById("featured-launch").innerHTML = `
    <div class="relative bg-slate-800/30 border border-slate-700 rounded-3xl overflow-hidden group hover:border-blue-500/50 transition-all">
      <div class="relative grid grid-cols-1 lg:grid-cols-2 gap-6 p-8">
        <div>
          <div class="flex items-center gap-3 mb-4">
            <span class="px-4 py-1.5 bg-blue-500/20 text-blue-400 rounded-full text-sm font-semibold flex items-center gap-2">
              <i class="fas fa-star"></i> Featured Launch
            </span>
            <span class="px-4 py-1.5 rounded-full text-sm font-semibold" style="background:${color}33; color:${color}">${launch.status}</span>
          </div>
          <h3 class="text-3xl font-bold mb-3 leading-tight">${launch.name}</h3>
          <div class="flex flex-col xl:flex-row xl:items-center gap-4 mb-6 text-slate-400">
            <div class="flex items-center gap-2"><i class="fas fa-building"></i><span>${launch.provider}</span></div>
            <div class="flex items-center gap-2"><i class="fas fa-rocket"></i><span>${launch.rocket}</span></div>
          </div>
          <div class="inline-flex items-center gap-3 px-6 py-3 bg-linear-to-r from-blue-500/20 to-purple-500/20 rounded-xl mb-6">
            <i class="fas fa-clock text-2xl text-blue-400"></i>
            <div>
              <p class="text-2xl font-bold text-blue-400">${daysLeft}</p>
              <p class="text-xs text-slate-400">Days Until Launch</p>
            </div>
          </div>
          <div class="grid xl:grid-cols-2 gap-4 mb-6">
            <div class="bg-slate-900/50 rounded-xl p-4">
              <p class="text-xs text-slate-400 mb-1 flex items-center gap-2"><i class="fas fa-calendar"></i> Launch Date</p>
              <p class="font-semibold">${launchDate(launch.net, "long")}</p>
            </div>
            <div class="bg-slate-900/50 rounded-xl p-4">
              <p class="text-xs text-slate-400 mb-1 flex items-center gap-2"><i class="fas fa-clock"></i> Launch Time</p>
              <p class="font-semibold">${launchTime(launch.net)}</p>
            </div>
            <div class="bg-slate-900/50 rounded-xl p-4">
              <p class="text-xs text-slate-400 mb-1 flex items-center gap-2"><i class="fas fa-map-marker-alt"></i> Location</p>
              <p class="font-semibold text-sm">${launch.location}</p>
            </div>
            <div class="bg-slate-900/50 rounded-xl p-4">
              <p class="text-xs text-slate-400 mb-1 flex items-center gap-2"><i class="fas fa-globe"></i> Country</p>
              <p class="font-semibold">${launch.country}</p>
            </div>
          </div>
          <p class="text-slate-300 leading-relaxed mb-6">${launch.description}</p>
        </div>
        <div class="relative h-full min-h-[400px] rounded-2xl overflow-hidden bg-slate-900/50">
          <img class="absolute inset-0 w-full h-full object-cover" src="${launch.image}" alt="${launch.name}"
               onerror="this.src='${fallbackLaunchImage}'" />
          <div class="absolute inset-0 bg-linear-to-t from-slate-900 via-transparent to-transparent"></div>
        </div>
      </div>
    </div>`;
}

function launchCard(launch) {
  const color = statusColor(launch.status);
  return `
    <div class="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden hover:border-blue-500/30 transition-all group cursor-pointer">
      <div class="relative h-48 bg-slate-900/50 flex items-center justify-center">
        <img class="w-full h-full object-cover" src="${launch.image}" alt="${launch.name}"
             onerror="this.src='${fallbackLaunchImage}'" />
        <div class="absolute top-3 right-3">
          <span class="px-3 py-1 text-white rounded-full text-xs font-semibold" style="background:${color}">${launch.status}</span>
        </div>
      </div>
      <div class="p-5">
        <h4 class="font-bold text-lg mb-2 line-clamp-2 group-hover:text-blue-400 transition-colors">${launch.name}</h4>
        <p class="text-sm text-slate-400 flex items-center gap-2 mb-3"><i class="fas fa-building text-xs"></i>${launch.provider}</p>
        <div class="space-y-2">
          <div class="flex items-center gap-2 text-sm"><i class="fas fa-calendar text-slate-500 w-4"></i><span class="text-slate-300">${launchDate(launch.net, "short")}</span></div>
          <div class="flex items-center gap-2 text-sm"><i class="fas fa-clock text-slate-500 w-4"></i><span class="text-slate-300">${launchTime(launch.net)}</span></div>
          <div class="flex items-center gap-2 text-sm"><i class="fas fa-rocket text-slate-500 w-4"></i><span class="text-slate-300">${launch.rocket}</span></div>
          <div class="flex items-center gap-2 text-sm"><i class="fas fa-map-marker-alt text-slate-500 w-4"></i><span class="text-slate-300 line-clamp-1">${launch.location}</span></div>
        </div>
      </div>
    </div>`;
}

function loadLaunches() {
  fetch(launchesUrl)
    .then(function (response) {
      return response.json();
    })
    .then(function (data) {
      if (!data.results) {
        throw new Error("The API did not return launches (maybe too many requests)");
      }

      const launches = data.results.map(getLaunchInfo);

      // update the counter in the header
      setText("launches-count", launches.length + " Launches");
      setText("launches-count-mobile", launches.length);

      // first launch = featured, all launches = grid
      showFeaturedLaunch(launches[0]);
      document.getElementById("launches-grid").innerHTML = launches.map(launchCard).join("");
    })
    .catch(function (error) {
      document.getElementById("featured-launch").innerHTML = "";
      document.getElementById("launches-grid").innerHTML =
        '<p class="text-red-400 text-sm col-span-full">Could not load launches: ' +
        error.message +
        "</p>";
    });
}

// ============================================
// 3) Planets (Solar System OpenData)
// ============================================
function getKey(planet) {
  return planet.englishName.toLowerCase(); // "Earth" -> "earth"
}

function toAU(planet) {
  return (planet.semimajorAxis / 149597870.7).toFixed(2);
}

function moonsCount(planet) {
  return planet.moons ? planet.moons.length : 0; // Mercury and Venus have moons = null
}

function planetCard(planet) {
  const key = getKey(planet);
  const color = planetStyles[key].color;
  return `
    <div class="planet-card bg-slate-800/50 border border-slate-700 rounded-2xl p-4 transition-all cursor-pointer group"
         data-planet-id="${key}" style="--planet-color: ${color}"
         onmouseover="this.style.borderColor='${color}80'" onmouseout="this.style.borderColor='#334155'">
      <div class="relative mb-3 h-24 flex items-center justify-center">
        <img class="w-20 h-20 object-contain group-hover:scale-110 transition-transform"
             src="./assets/images/${key}.png" alt="${planet.englishName}" />
      </div>
      <h4 class="font-semibold text-center text-sm">${planet.englishName}</h4>
      <p class="text-xs text-slate-400 text-center">${toAU(planet)} AU</p>
    </div>`;
}

function comparisonRow(planet) {
  const key = getKey(planet);
  const style = planetStyles[key];
  const cell = "px-4 md:px-6 py-3 md:py-4 text-slate-300 text-sm md:text-base whitespace-nowrap";

  // mass compared to Earth (Earth = 1)
  const mass = planet.mass.massValue * Math.pow(10, planet.mass.massExponent);
  const massVsEarth = mass / 5.97237e24;

  // orbital period: days for short ones, years for long ones
  let period = Math.round(planet.sideralOrbit) + " days";
  if (planet.sideralOrbit > 1000) {
    period = (planet.sideralOrbit / 365.25).toFixed(1) + " years";
  }

  return `
    <tr class="hover:bg-slate-800/30 transition-colors">
      <td class="px-4 md:px-6 py-3 md:py-4 sticky left-0 bg-slate-800 z-10">
        <div class="flex items-center space-x-2 md:space-x-3">
          <div class="w-6 h-6 md:w-8 md:h-8 rounded-full flex-shrink-0" style="background-color: ${style.color}"></div>
          <span class="font-semibold text-sm md:text-base whitespace-nowrap">${planet.englishName}</span>
        </div>
      </td>
      <td class="${cell}">${toAU(planet)}</td>
      <td class="${cell}">${Math.round(planet.meanRadius * 2).toLocaleString()}</td>
      <td class="${cell}">${massVsEarth < 1 ? massVsEarth.toFixed(3) : massVsEarth.toFixed(1)}</td>
      <td class="${cell}">${period}</td>
      <td class="${cell}">${moonsCount(planet)}</td>
      <td class="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap">
        <span class="px-2 py-1 rounded text-xs ${style.badge}">${planet.type}</span>
      </td>
    </tr>`;
}

// fill the big details area with the selected planet
function showPlanet(key) {
  let planet = null;
  planets.forEach(function (p) {
    if (getKey(p) === key) {
      planet = p;
    }
  });
  if (!planet) return;

  const image = document.getElementById("planet-detail-image");
  image.src = "./assets/images/" + key + ".png";
  image.alt = planet.englishName;

  setText("planet-detail-name", planet.englishName);
  setText("planet-detail-description", planet.description);
  setText("planet-distance", (planet.semimajorAxis / 1000000).toFixed(1) + "M km");
  setText("planet-radius", Math.round(planet.meanRadius).toLocaleString() + " km");
  document.getElementById("planet-mass").innerHTML =
    planet.mass.massValue.toFixed(2) + " × 10<sup>" + planet.mass.massExponent + "</sup> kg";
  setText("planet-density", planet.density.toFixed(2) + " g/cm³");
  setText("planet-orbital-period", planet.sideralOrbit + " days");
  setText("planet-rotation", Math.abs(planet.sideralRotation) + " hours");
  setText("planet-moons", moonsCount(planet));
  setText("planet-gravity", planet.gravity + " m/s²");
  setText("planet-discoverer", planet.discoveredBy || "Known since antiquity");
  setText("planet-discovery-date", planet.discoveryDate || "Ancient");
  setText("planet-body-type", planet.bodyType);
  document.getElementById("planet-volume").innerHTML =
    planet.vol.volValue + " × 10<sup>" + planet.vol.volExponent + "</sup> km³";
  setText("planet-perihelion", (planet.perihelion / 1000000).toFixed(1) + "M km");
  setText("planet-aphelion", (planet.aphelion / 1000000).toFixed(1) + "M km");
  setText("planet-eccentricity", planet.eccentricity);
  setText("planet-inclination", planet.inclination + "°");
  setText("planet-axial-tilt", planet.axialTilt + "°");
  setText("planet-escape", (planet.escape / 1000).toFixed(1) + " km/s");

  // the API gives the temperature in Kelvin, the design shows Celsius
  // (Mercury comes as 0 in the API, so we show N/A)
  if (planet.avgTemp > 0) {
    setText("planet-temp", Math.round(planet.avgTemp - 273.15) + "°C");
  } else {
    setText("planet-temp", "N/A");
  }

  // quick facts built from the data
  const facts = [
    moonsCount(planet) + " known moons",
    "Gravity is " + (planet.gravity / 9.80665).toFixed(2) + "x Earth's",
    "One year lasts " + Math.round(planet.sideralOrbit) + " Earth days",
    "Planet type: " + planet.type,
  ];
  let factsHtml = "";
  facts.forEach(function (fact) {
    factsHtml +=
      '<li class="flex items-start"><i class="fas fa-check text-green-400 mt-1 mr-2"></i>' +
      '<span class="text-slate-300">' +
      fact +
      "</span></li>";
  });
  document.getElementById("planet-facts").innerHTML = factsHtml;
}

function loadPlanets() {
  fetch(planetsUrl)
    .then(function (response) {
      return response.json();
    })
    .then(function (data) {
      // sort from the closest planet to the farthest one
      planets = data.bodies.sort(function (a, b) {
        return a.semimajorAxis - b.semimajorAxis;
      });

      document.getElementById("planets-grid").innerHTML = planets.map(planetCard).join("");
      document.getElementById("planet-comparison-tbody").innerHTML = planets
        .map(comparisonRow)
        .join("");

      showPlanet("earth"); // Earth is selected at the start
    })
    .catch(function (error) {
      document.getElementById("planets-grid").innerHTML =
        '<p class="text-red-400 text-sm col-span-full">Could not load planets: ' +
        error.message +
        "</p>";
    });
}

// click on a planet card -> show its details
document.getElementById("planets-grid").addEventListener("click", function (event) {
  const card = event.target.closest(".planet-card");
  if (card) {
    showPlanet(card.dataset.planetId);
  }
});

// ============================================
// Start the app
// ============================================
loadApod();
loadLaunches();
loadPlanets();
