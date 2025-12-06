<?php

// @TODO check for consent.google.com page, if need be

class google{
	
	public function __construct(){
		
		include "lib/fuckhtml.php";
		$this->fuckhtml = new fuckhtml();
		
		include "lib/backend.php";
		$this->backend = new backend("google");
	}
	
	public function getfilters($page){
		
		$base = [
			"country" => [ // gl=<country> (image: cr=countryAF)
				"display" => "Country",
				"option" => [
					"any" => "Instance's country",
					"af" => "Afghanistan",
					"al" => "Albania",
					"dz" => "Algeria",
					"as" => "American Samoa",
					"ad" => "Andorra",
					"ao" => "Angola",
					"ai" => "Anguilla",
					"aq" => "Antarctica",
					"ag" => "Antigua and Barbuda",
					"ar" => "Argentina",
					"am" => "Armenia",
					"aw" => "Aruba",
					"au" => "Australia",
					"at" => "Austria",
					"az" => "Azerbaijan",
					"bs" => "Bahamas",
					"bh" => "Bahrain",
					"bd" => "Bangladesh",
					"bb" => "Barbados",
					"by" => "Belarus",
					"be" => "Belgium",
					"bz" => "Belize",
					"bj" => "Benin",
					"bm" => "Bermuda",
					"bt" => "Bhutan",
					"bo" => "Bolivia",
					"ba" => "Bosnia and Herzegovina",
					"bw" => "Botswana",
					"bv" => "Bouvet Island",
					"br" => "Brazil",
					"io" => "British Indian Ocean Territory",
					"bn" => "Brunei Darussalam",
					"bg" => "Bulgaria",
					"bf" => "Burkina Faso",
					"bi" => "Burundi",
					"kh" => "Cambodia",
					"cm" => "Cameroon",
					"ca" => "Canada",
					"cv" => "Cape Verde",
					"ky" => "Cayman Islands",
					"cf" => "Central African Republic",
					"td" => "Chad",
					"cl" => "Chile",
					"cn" => "China",
					"cx" => "Christmas Island",
					"cc" => "Cocos (Keeling) Islands",
					"co" => "Colombia",
					"km" => "Comoros",
					"cg" => "Congo",
					"cd" => "Congo, the Democratic Republic",
					"ck" => "Cook Islands",
					"cr" => "Costa Rica",
					"ci" => "Cote D'ivoire",
					"hr" => "Croatia",
					"cu" => "Cuba",
					"cy" => "Cyprus",
					"cz" => "Czech Republic",
					"dk" => "Denmark",
					"dj" => "Djibouti",
					"dm" => "Dominica",
					"do" => "Dominican Republic",
					"ec" => "Ecuador",
					"eg" => "Egypt",
					"sv" => "El Salvador",
					"gq" => "Equatorial Guinea",
					"er" => "Eritrea",
					"ee" => "Estonia",
					"et" => "Ethiopia",
					"fk" => "Falkland Islands (Malvinas)",
					"fo" => "Faroe Islands",
					"fj" => "Fiji",
					"fi" => "Finland",
					"fr" => "France",
					"gf" => "French Guiana",
					"pf" => "French Polynesia",
					"tf" => "French Southern Territories",
					"ga" => "Gabon",
					"gm" => "Gambia",
					"ge" => "Georgia",
					"de" => "Germany",
					"gh" => "Ghana",
					"gi" => "Gibraltar",
					"gr" => "Greece",
					"gl" => "Greenland",
					"gd" => "Grenada",
					"gp" => "Guadeloupe",
					"gu" => "Guam",
					"gt" => "Guatemala",
					"gn" => "Guinea",
					"gw" => "Guinea-Bissau",
					"gy" => "Guyana",
					"ht" => "Haiti",
					"hm" => "Heard Island and Mcdonald Islands",
					"va" => "Holy See (Vatican City State)",
					"hn" => "Honduras",
					"hk" => "Hong Kong",
					"hu" => "Hungary",
					"is" => "Iceland",
					"in" => "India",
					"id" => "Indonesia",
					"ir" => "Iran, Islamic Republic",
					"iq" => "Iraq",
					"ie" => "Ireland",
					"il" => "Israel",
					"it" => "Italy",
					"jm" => "Jamaica",
					"jp" => "Japan",
					"jo" => "Jordan",
					"kz" => "Kazakhstan",
					"ke" => "Kenya",
					"ki" => "Kiribati",
					"kp" => "Korea, Democratic People's Republic",
					"kr" => "Korea, Republic",
					"kw" => "Kuwait",
					"kg" => "Kyrgyzstan",
					"la" => "Lao People's Democratic Republic",
					"lv" => "Latvia",
					"lb" => "Lebanon",
					"ls" => "Lesotho",
					"lr" => "Liberia",
					"ly" => "Libyan Arab Jamahiriya",
					"li" => "Liechtenstein",
					"lt" => "Lithuania",
					"lu" => "Luxembourg",
					"mo" => "Macao",
					"mk" => "Macedonia, the Former Yugosalv Republic",
					"mg" => "Madagascar",
					"mw" => "Malawi",
					"my" => "Malaysia",
					"mv" => "Maldives",
					"ml" => "Mali",
					"mt" => "Malta",
					"mh" => "Marshall Islands",
					"mq" => "Martinique",
					"mr" => "Mauritania",
					"mu" => "Mauritius",
					"yt" => "Mayotte",
					"mx" => "Mexico",
					"fm" => "Micronesia, Federated States",
					"md" => "Moldova, Republic",
					"mc" => "Monaco",
					"mn" => "Mongolia",
					"ms" => "Montserrat",
					"ma" => "Morocco",
					"mz" => "Mozambique",
					"mm" => "Myanmar",
					"na" => "Namibia",
					"nr" => "Nauru",
					"np" => "Nepal",
					"nl" => "Netherlands",
					"an" => "Netherlands Antilles",
					"nc" => "New Caledonia",
					"nz" => "New Zealand",
					"ni" => "Nicaragua",
					"ne" => "Niger",
					"ng" => "Nigeria",
					"nu" => "Niue",
					"nf" => "Norfolk Island",
					"mp" => "Northern Mariana Islands",
					"no" => "Norway",
					"om" => "Oman",
					"pk" => "Pakistan",
					"pw" => "Palau",
					"ps" => "Palestinian Territory, Occupied",
					"pa" => "Panama",
					"pg" => "Papua New Guinea",
					"py" => "Paraguay",
					"pe" => "Peru",
					"ph" => "Philippines",
					"pn" => "Pitcairn",
					"pl" => "Poland",
					"pt" => "Portugal",
					"pr" => "Puerto Rico",
					"qa" => "Qatar",
					"re" => "Reunion",
					"ro" => "Romania",
					"ru" => "Russian Federation",
					"rw" => "Rwanda",
					"sh" => "Saint Helena",
					"kn" => "Saint Kitts and Nevis",
					"lc" => "Saint Lucia",
					"pm" => "Saint Pierre and Miquelon",
					"vc" => "Saint Vincent and the Grenadines",
					"ws" => "Samoa",
					"sm" => "San Marino",
					"st" => "Sao Tome and Principe",
					"sa" => "Saudi Arabia",
					"sn" => "Senegal",
					"cs" => "Serbia and Montenegro",
					"sc" => "Seychelles",
					"sl" => "Sierra Leone",
					"sg" => "Singapore",
					"sk" => "Slovakia",
					"si" => "Slovenia",
					"sb" => "Solomon Islands",
					"so" => "Somalia",
					"za" => "South Africa",
					"gs" => "South Georgia and the South Sandwich Islands",
					"es" => "Spain",
					"lk" => "Sri Lanka",
					"sd" => "Sudan",
					"sr" => "Suriname",
					"sj" => "Svalbard and Jan Mayen",
					"sz" => "Swaziland",
					"se" => "Sweden",
					"ch" => "Switzerland",
					"sy" => "Syrian Arab Republic",
					"tw" => "Taiwan, Province of China",
					"tj" => "Tajikistan",
					"tz" => "Tanzania, United Republic",
					"th" => "Thailand",
					"tl" => "Timor-Leste",
					"tg" => "Togo",
					"tk" => "Tokelau",
					"to" => "Tonga",
					"tt" => "Trinidad and Tobago",
					"tn" => "Tunisia",
					"tr" => "Turkey",
					"tm" => "Turkmenistan",
					"tc" => "Turks and Caicos Islands",
					"tv" => "Tuvalu",
					"ug" => "Uganda",
					"ua" => "Ukraine",
					"ae" => "United Arab Emirates",
					"uk" => "United Kingdom",
					"us" => "United States",
					"um" => "United States Minor Outlying Islands",
					"uy" => "Uruguay",
					"uz" => "Uzbekistan",
					"vu" => "Vanuatu",
					"ve" => "Venezuela",
					"vn" => "Viet Nam",
					"vg" => "Virgin Islands, British",
					"vi" => "Virgin Islands, U.S.",
					"wf" => "Wallis and Futuna",
					"eh" => "Western Sahara",
					"ye" => "Yemen",
					"zm" => "Zambia",
					"zw" => "Zimbabwe"
				]
			],
			"nsfw" => [
				"display" => "NSFW",
				"option" => [
					"yes" => "Yes", // safe=active
					"no" => "No" // safe=off
				]
			]
		];
		
		switch($page){
			
			case "web":
				return array_merge(
					$base,
					[
						"lang" => [ // lr=<lang> (prefix lang with "lang_")
							"display" => "Language",
							"option" => [
								"any" => "Any language",
								"ar" => "Arabic",
								"bg" => "Bulgarian",
								"ca" => "Catalan",
								"cs" => "Czech",
								"da" => "Danish",
								"de" => "German",
								"el" => "Greek",
								"en" => "English",
								"es" => "Spanish",
								"et" => "Estonian",
								"fi" => "Finnish",
								"fr" => "French",
								"hr" => "Croatian",
								"hu" => "Hungarian",
								"id" => "Indonesian",
								"is" => "Icelandic",
								"it" => "Italian",
								"iw" => "Hebrew",
								"ja" => "Japanese",
								"ko" => "Korean",
								"lt" => "Lithuanian",
								"lv" => "Latvian",
								"nl" => "Dutch",
								"no" => "Norwegian",
								"pl" => "Polish",
								"pt" => "Portuguese",
								"ro" => "Romanian",
								"ru" => "Russian",
								"sk" => "Slovak",
								"sl" => "Slovenian",
								"sr" => "Serbian",
								"sv" => "Swedish",
								"tr" => "Turkish",
								"zh-CN" => "Chinese (Simplified)",
								"zh-TW" => "Chinese (Traditional)"
							]
						],
						"newer" => [ // tbs
							"display" => "Newer than",
							"option" => "_DATE"
						],
						"older" => [
							"display" => "Older than",
							"option" => "_DATE"
						],
						"spellcheck" => [
							"display" => "Spellcheck",
							"option" => [
								"yes" => "Yes",
								"no" => "No"
							]
						]
					]
				);
				break;
			
			case "images":
				return array_merge(
					$base,
					[
						"time" => [ // tbs=qdr:<time>
							"display" => "Time posted",
							"option" => [
								"any" => "Any time",
								"d" => "Past 24 hours",
								"w" => "Past week",
								"m" => "Past month",
								"y" => "Past year"
							]
						],
						"size" => [ // imgsz
							"display" => "Size",
							"option" => [
								"any" => "Any size",
								"l" => "Large",
								"m" => "Medium",
								"i" => "Icon",
								"qsvga" => "Larger than 400x300",
								"vga" => "Larger than 640x480",
								"svga" => "Larger than 800x600",
								"xga" => "Larger than 1024x768",
								"2mp" => "Larger than 2MP",
								"4mp" => "Larger than 4MP",
								"6mp" => "Larger than 6MP",
								"8mp" => "Larger than 8MP",
								"10mp" => "Larger than 10MP",
								"12mp" => "Larger than 12MP",
								"15mp" => "Larger than 15MP",
								"20mp" => "Larger than 20MP",
								"40mp" => "Larger than 40MP",
								"70mp" => "Larger than 70MP"
							]
						],
						"ratio" => [ // imgar
							"display" => "Aspect ratio",
							"option" => [
								"any" => "Any ratio",
								"t|xt" => "Tall",
								"s" => "Square",
								"w" => "Wide",
								"xw" => "Panoramic"
							]
						],
						"color" => [ // imgc
							"display" => "Color",
							"option" => [
								"any" => "Any color",
								"color" => "Full color",
								"bnw" => "Black & white",
								"trans" => "Transparent",
								// from here, imgcolor
								"red" => "Red",
								"orange" => "Orange",
								"yellow" => "Yellow",
								"green" => "Green",
								"teal" => "Teal",
								"blue" => "Blue",
								"purple" => "Purple",
								"pink" => "Pink",
								"white" => "White",
								"gray" => "Gray",
								"black" => "Black",
								"brown" => "Brown"
							]
						],
						"type" => [ // tbs=itp:<type>
							"display" => "Type",
							"option" => [
								"any" => "Any type",
								"clipart" => "Clip Art",
								"lineart" => "Line Drawing",
								"animated" => "Animated"
							]
						],
						"format" => [ // as_filetype
							"display" => "Format",
							"option" => [
								"any" => "Any format",
								"jpg" => "JPG",
								"gif" => "GIF",
								"png" => "PNG",
								"bmp" => "BMP",
								"svg" => "SVG",
								"webp" => "WEBP",
								"ico" => "ICO",
								"craw" => "RAW"
							]
						],
						"rights" => [ // tbs=sur:<rights>
							"display" => "Usage rights",
							"option" => [
								"any" => "Any license",
								"cl" => "Creative Commons licenses",
								"ol" => "Commercial & other licenses"
							]
						]
					]
				);
				break;
			
			case "videos":
				return array_merge(
					$base,
					[
						"newer" => [ // tbs
							"display" => "Newer than",
							"option" => "_DATE"
						],
						"older" => [
							"display" => "Older than",
							"option" => "_DATE"
						],
						"duration" => [
							"display" => "Duration",
							"option" => [
								"any" => "Any duration",
								"s" => "Short (0-4min)", // tbs=dur:s
								"m" => "Medium (4-20min)", // tbs=dur:m
								"l" => "Long (20+ min)" // tbs=dur:l
							]
						],
						"quality" => [
							"display" => "Quality",
							"option" => [
								"any" => "Any quality",
								"h" => "High quality" // tbs=hq:h
							]
						],
						"captions" => [
							"display" => "Captions",
							"option" => [
								"any" => "No preference",
								"yes" => "Closed captioned" // tbs=cc:1
							]
						]
					]
				);
				break;
			
			case "news":
				return array_merge(
					$base,
					[
						"newer" => [ // tbs
							"display" => "Newer than",
							"option" => "_DATE"
						],
						"older" => [
							"display" => "Older than",
							"option" => "_DATE"
						],
						"sort" => [
							"display" => "Sort",
							"option" => [
								"relevance" => "Relevance", 
								"date" => "Date" // sbd:1
							]
						]
					]
				);
				break;
		}
	}
	
	private function get($proxy, $url, $get = [], $alt_ua = false){
		
		$curlproc = curl_init();
		
		if($get !== []){
			$get = http_build_query($get);
			$url .= "?" . $get;
		}
		
		curl_setopt($curlproc, CURLOPT_URL, $url);
		
		curl_setopt($curlproc, CURLOPT_ENCODING, ""); // default encoding
		
		if($alt_ua === true){
			
			curl_setopt($curlproc, CURLOPT_HTTPHEADER, [
				"User-Agent: Mozilla/4.0 (compatible; MSIE 6.0; Windows CE; PPC; 240x320) Opera 8.65 [nl]",
				"Accept: text/html, application/xml;q=0.9, */*;q=0.8",
				"Accept-Language: nl,en;q=0.8",
				"Accept-Encoding: gzip, deflate",
				"Connection: Keep-Alive",
				"Cache-Control: no-cache"
			]);
		}else{
			
			curl_setopt($curlproc, CURLOPT_HTTP_VERSION, CURL_HTTP_VERSION_2_0);
			curl_setopt($curlproc, CURLOPT_HTTPHEADER, [
				"User-Agent: " . config::USER_AGENT,
				"Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
				"Accept-Language: en-US,en;q=0.5",
				"Accept-Encoding: gzip",
				"DNT: 1",
				"Connection: keep-alive",
				"Upgrade-Insecure-Requests: 1",
				"Sec-Fetch-Dest: document",
				"Sec-Fetch-Mode: navigate",
				"Sec-Fetch-Site: none",
				"Sec-Fetch-User: ?1",
				"Priority: u=1",
				"TE: trailers"
			]);
		}
		
		curl_setopt($curlproc, CURLOPT_RETURNTRANSFER, true);
		curl_setopt($curlproc, CURLOPT_SSL_VERIFYHOST, 2);
		curl_setopt($curlproc, CURLOPT_SSL_VERIFYPEER, true);
		curl_setopt($curlproc, CURLOPT_CONNECTTIMEOUT, 30);
		curl_setopt($curlproc, CURLOPT_TIMEOUT, 30);
		
		// follow redirects
		curl_setopt($curlproc, CURLOPT_FOLLOWLOCATION, true);

		$this->backend->assign_proxy($curlproc, $proxy);
		
		$data = curl_exec($curlproc);
		
		if(curl_errno($curlproc)){
			
			throw new Exception(curl_error($curlproc));
		}
		
		curl_close($curlproc);
		
		return $data;
	}
	
	
	public function web($get){
		
		// this is going to break soon. I wont scrape the answers simply cause its not worth my time.
		// If only their API wasn't such dogshit maybe I wouldnt need to fuck with this. this isn't
		// just a rant. I know a Google engineer is reading this, give me real fucking results
		// you worthless sacks of shit
		
		$out = [
			"status" => "ok",
			"spelling" => [
				"type" => "no_correction",
				"using" => null,
				"correction" => null
			],
			"npt" => null,
			"answer" => [],
			"web" => [],
			"image" => [],
			"video" => [],
			"news" => [],
			"related" => []
		];
		
		if($get["npt"]){
			
			[$get, $proxy] = $this->backend->get($get["npt"], "web");
			
			try{
				$html =
					$this->get(
						$proxy,
						"https://www.google.com" . $get,
						[],
						true
					);
			}catch(Exception $error){
				
				throw new Exception("Failed to get HTML");
			}
		}else{
			
			$search = $get["s"];
			$country = $get["country"];
			$nsfw = $get["nsfw"];
			$lang = $get["lang"];
			$older = $get["older"];
			$newer = $get["newer"];
			$spellcheck = $get["spellcheck"];
			$proxy = $this->backend->get_ip();
			
			$offset = 0;
			
			$params = [
				"q" => $search,
				"hl" => "en"
			];
			
			// country
			if($country != "any"){
				
				$params["gl"] = $country;
			}
			
			// nsfw
			$params["safe"] = $nsfw == "yes" ? "off" : "active";
			
			// language
			if($lang != "any"){
				
				$params["lr"] = "lang_" . $lang;
			}
			
			// generate tbs
			$tbs = [];
			
			// get date
			$older = $older === false ? null : date("m/d/Y", $older);
			$newer = $newer === false ? null : date("m/d/Y", $newer);
			
			if(
				$older !== null ||
				$newer !== null
			){
				
				$tbs["cdr"] = "1";
				$tbs["cd_min"] = $newer;
				$tbs["cd_max"] = $older;
			}
			
			// spellcheck filter
			if($spellcheck == "no"){
				
				$params["nfpr"] = "1";
			}
			
			if(count($tbs) !== 0){
				
				$params["tbs"] = "";
				
				foreach($tbs as $key => $value){
					
					$params["tbs"] .= $key . ":" . $value . ",";
				}
				
				$params["tbs"] = rtrim($params["tbs"], ",");
			}
			
			try{
				$html =
					$this->get(
						$proxy,
						"https://www.google.com/search",
						$params,
						true
					);
			}catch(Exception $error){
				
				throw new Exception("Failed to get HTML");
			}
			//$html = file_get_contents("scraper/google.html");
		}
		
		// init
		$this->fuckhtml->load($html);
		$this->detect_sorry();
		$this->parsestyles();
		
		// iterate over results
		$containers =
			$this->fuckhtml
			->getElementsByClassName(
				$this->getstyle([
					"background-color" => "#fff",
					"margin-bottom" => "10px",
					"margin" => "0px 0px 8px",
					"box-shadow" => "0 0 0 1px #ebedef"
				])
			);
		
		foreach($containers as $container){
			
			$this->fuckhtml->load($container);
			
			//
			// Probe for next page container
			//
			$npt =
				$this->fuckhtml
				->getElementsByAttributeValue(
					"aria-label",
					"Next page",
					"a"
				);
			
			if(count($npt) !== 0){
				
				// found next page object
				$out["npt"] =
					$this->backend->store(
						$this->fuckhtml
						->getTextContent(
							$npt[0]
							["attributes"]
							["href"]
						),
						"web",
						$proxy
					);
				continue;
			}
			
			//
			// Probe for "did you mean" bullshit
			//
			$ddm =
				$this->fuckhtml
				->getElementsByClassName(
					$this->getstyle([
						"font-size" => "20px",
						"font-weight" => "bold",
						"line-height" => "26px",
						"color" => "#1f1f1f",
						"height" => "14px",
						"padding" => "16px 14px 0px 14px",
						"margin" => "0"
					])
				);
			
			if(
				count($ddm) !== 0 &&
				strtolower(
					$this->fuckhtml
					->getTextContent(
						$ddm[0]
					)
				) == "people also search for"
			){
				
				$as =
					$this->fuckhtml
					->getElementsByTagName("a");
				
				foreach($as as $a){
					
					$out["related"][] =
						$this->fuckhtml
						->getTextContent(
							$a
						);
				}
				continue;
			}
			
			//
			// Parse normal web results
			//
			
			// probe for website ellipsis shit
			$ellipsis =
				$this->fuckhtml
				->getElementsByClassName(
					$this->getstyle([
						"text-overflow" => "ellipsis",
						"white-space" => "nowrap",
						"overflow" => "hidden"
					])
				);
			
			if(count($ellipsis) < 1){
				
				// should not happen
				continue;
			}
			
			$title =
				$this->fuckhtml
				->getElementsByTagName(
					"h3"
				);
			
			if(count($title) === 0){
				
				// should not happen
				continue;
			}
			
			$title =
				$this->fuckhtml
				->getTextContent(
					$title[0]
				);
			
			// get URL
			$as =
				$this->fuckhtml
				->getElementsByTagName(
					"a"
				);
			
			if(count($as) === 0){
				
				// should not happen
				continue;
			}
			
			$link =
				$this->unshiturl(
					$as[0]
					["attributes"]
					["href"]
				);
			
			// grep container separators
			$separator =
				$this->fuckhtml
				->getElementsByClassName(
					$this->getstyle([
						"padding" => "16px 14px 12px"
					])
				);
			
			if(count($separator) < 2){
				
				// should not happen
				continue;
			}
			
			$this->fuckhtml->load($separator[1]);
			
			$snippets =
				$this->fuckhtml
				->getElementsByClassName(
					$this->getstyle([
						"white-space" => "pre-line",
						"word-wrap" => "break-word"
					])
				);
			
			if(count($snippets) < 2){
				
				// should not happen
				continue;
			}
			
			// get description
			$description =
				$this->fuckhtml
				->getTextContent(
					$snippets[1]
				);
			
			// get date from description
			$exp_description = explode(" · ", $description, 2);
			$date = null;
			
			if(count($exp_description) === 1){
				
				$description = $exp_description[0];
			}else{
				
				$date_probe = strtotime($exp_description[0]);
				
				if(
					strlen($exp_description[0]) <= 17 &&
					$date_probe !== false
				){
					
					$date = $date_probe;
					$description = $exp_description[1];
				}
			}
			
			// get thumb
			$thumb_probe =
				$this->fuckhtml
				->getElementsByTagName(
					"img"
				);
			
			// too lazy to fix this piece of shit
			// will probably break soon anyways idgaf
			/*
			if(count($thumb_probe) === 0){
				
				$thumb = [
					"ratio" => null,
					"url" => null
				];
			}else{
				
				$thumb = [
					"ratio" => "1:1",
					"url" =>
						$this->getdimg(
							$thumb_probe[0]
							["attributes"]
							["id"]
						)
				];
			}*/
			
			$thumb = [
				"ratio" => null,
				"url" => null
			];
			
			// get sublinks
			$sublinks = [];
			foreach($as as $a){
				
				$this->fuckhtml->load($a);
				
				$probe =
					$this->fuckhtml
					->getElementsByClassName(
						$this->getstyle([
							"color" => "#1558d6",
							"font-size" => "14px",
							"line-height" => "20px"
						])
					);
				
				$url =
					$this->unshiturl(
						$a["attributes"]["href"]
					);
				
				if(
					preg_match(
						'/^http/',
						$url
					)
				){
					
					if(count($probe) !== 0){
						
						$sublinks[] = [
							"title" =>
								$this->titledots(
									$this->fuckhtml
									->getTextContent(
										$probe[0]
									)
								),
							"description" => null,
							"date" => null,
							"url" => $url
						];
					}
				}
			}
			
			$out["web"][] = [
				"title" =>
					$this->titledots(
						$title
					),
				"description" =>
					$this->titledots(
						$description
					),
				"url" => $link,
				"date" => $date,
				"type" => "web",
				"thumb" => $thumb,
				"sublink" => $sublinks,
				"table" => []
			];
		}
		
		return $out;
	}
	
	
	public function video($get){
		
		if($get["npt"]){
			
			[$params, $proxy] = $this->backend->get($get["npt"], "video");
			$params = json_decode($params, true);
			
		}else{
			$search = $get["s"];
			$country = $get["country"];
			$nsfw = $get["nsfw"];
			$older = $get["older"];
			$newer = $get["newer"];
			$duration = $get["duration"];
			$quality = $get["quality"];
			$captions = $get["captions"];
			$proxy = $this->backend->get_ip();
			
			$params = [
				"q" => $search,
				"udm" => "7",
				"hl" => "en",
				"num" => 20
			];
			
			// country
			if($country != "any"){
				
				$params["gl"] = $country;
			}
			
			// nsfw
			$params["safe"] = $nsfw == "yes" ? "off" : "active";
			
			$tbs = [];
			
			// get date
			$older = $older === false ? null : date("m/d/Y", $older);
			$newer = $newer === false ? null : date("m/d/Y", $newer);
			
			if(
				$older !== null ||
				$newer !== null
			){
				
				$tbs["cdr"] = "1";
				$tbs["cd_min"] = $newer;
				$tbs["cd_max"] = $older;
			}
			
			// duration
			if($duration != "any"){
				
				$tbs[] = "dur:" . $duration;
			}
			
			// quality
			if($quality != "any"){
				
				$tbs[] = "hq:" . $quality;
			}
			
			// captions
			if($captions != "any"){
				
				$tbs[] = "cc:" . $captions;
			}
			
			// append tbs
			if(count($tbs) !== 0){
				
				$params["tbs"] =
					implode(",", $tbs);
			}
		}
		
		try{
			$html =
				$this->get(
					$proxy,
					"https://www.google.com/search",
					$params
				);
		}catch(Exception $error){
			
			throw new Exception("Failed to get HTML");
		}
		
		if(!isset($params["start"])){
			
			$params["start"] = 0;
		}
		$params["start"] += 20;
		
		$this->fuckhtml->load($html);
		
		//
		// Parse web video page
		//
		$this->detect_sorry();
		
		// parse all <style> tags
		$this->parsestyles();
		
		// get javascript images
		$this->scrape_dimg($html);
		
		$this->scrape_imagearr($html);
		
		$out = [
			"status" => "ok",
			"npt" =>
				$this->backend->store(
					json_encode($params),
					"videos",
					$proxy
				),
			"video" => [],
			"author" => [],
			"livestream" => [],
			"playlist" => [],
			"reel" => []
		];
		
		$search_div =
			$this->fuckhtml
			->getElementById(
				"center_col"
			);
		
		if($search_div === false){
			
			throw new Exception("Failed to grep search div");
		}
		
		$this->fuckhtml->load($search_div);
		
		$results =
			$this->fuckhtml
			->getElementsByClassName(
				$this->getstyle([
					"margin" => "0px 0px 30px"
				]),
				"div"
			);
		
		foreach($results as $result){
			
			$this->fuckhtml->load($result);
			
			$url =
				$this->fuckhtml
				->getElementsByTagName(
					"a"
				);
			
			if(count($url) === 0){
				
				// no url, weird, continue
				continue;
			}
			
			$title =
				$this->fuckhtml
				->getElementsByTagName(
					"h3"
				);
			
			if(count($title) === 0){
				
				// no title, weird, continue
				continue;
			}
			
			// get description
			$description =
				$this->fuckhtml
				->getElementsByClassName(
					$this->getstyle([
						"-webkit-box-orient" => "vertical",
						"display" => "-webkit-box",
						"-webkit-line-clamp" => "2",
						"overflow" => "hidden",
						"word-break" => "break-word"
					]),
					"div"
				);
			
			if(count($description) === 0){
				
				$description = null;
			}else{
				
				$description =
					html_entity_decode(
						$this->titledots(
							$this->fuckhtml
							->getTextContent(
								$description[0]
							)
						)
					);
			}
			
			// get author + date posted
			$metadiv =
				$this->fuckhtml
				->getElementsByClassName(
					$this->getstyle([
						"margin-top" => "12px"
					]),
					"div"
				);
			
			$author = null;
			$date = null;
			
			if(count($metadiv) !== 0){
				
				$metadiv =
					explode(
						"·",
						$this->fuckhtml
						->getTextContent(
							$metadiv[0]
						)
					);
				
				if(count($metadiv) === 3){
					
					$author = trim($metadiv[1]);
					$date = strtotime(trim($metadiv[2]));
				}elseif(count($metadiv) === 2){
					
					$author = trim($metadiv[0]);
					$date = strtotime(trim($metadiv[1]));
				}
			}
			
			$thumb = [
				"url" => null,
				"ratio" => null
			];
			
			$image =
				$this->fuckhtml
				->getElementsByTagName(
					"img"
				);
			
			$duration = null;
			
			if(
				count($image) !== 0 &&
				isset($image[0]["attributes"]["id"])
			){
				
				$thumb = [
					"url" => $this->getdimg($image[0]["attributes"]["id"]),
					"ratio" => "16:9"
				];
				
				// get duration
				$duration =
					$this->fuckhtml
					->getElementsByClassName(
						$this->getstyle([
							"background-color" => "rgba(0,0,0,0.6)",
							"color" => "#fff",
							"fill" => "#fff"
						])
					);
				
				if(count($duration) !== 0){
					
					$duration =
						$this->hms2int(
							$this->fuckhtml
							->getTextContent(
								$duration[0]
							));
				}else{
					
					$duration = null;
				}
			}
			
			$out["video"][] = [
				"title" =>
					$this->titledots(
						$this->fuckhtml
						->getTextContent(
							$title[0]
						)
					),
				"description" => $description,
				"author" => [
					"name" => $author,
					"url" => null,
					"avatar" => null
				],
				"date" => $date,
				"duration" => $duration,
				"views" => null,
				"thumb" => $thumb,
				"url" =>
					$this->fuckhtml
					->getTextContent(
						$url[0]["attributes"]["href"]
					)
			];
		}
		
		return $out;
	}
	
	
	public function news($get){
		
		if($get["npt"]){
			
			[$req, $proxy] = $this->backend->get($get["npt"], "news");
			/*parse_str(
				parse_url($req, PHP_URL_QUERY),
				$search
			);*/
			
			try{
				
				$html =
					$this->get(
						$proxy,
						"https://www.google.com" . $req,
						[]
					);
			}catch(Exception $error){
				
				throw new Exception("Failed to get HTML");
			}
			
		}else{
			$search = $get["s"];
			$country = $get["country"];
			$nsfw = $get["nsfw"];
			$older = $get["older"];
			$newer = $get["newer"];
			$sort = $get["sort"];
			$proxy = $this->backend->get_ip();
			
			$params = [
				"q" => $search,
				"tbm" => "nws",
				"hl" => "en",
				"num" => "20"
			];
			
			// country
			if($country != "any"){
				
				$params["gl"] = $country;
			}
			
			// nsfw
			$params["safe"] = $nsfw == "yes" ? "off" : "active";
			
			$tbs = [];
			
			// get date
			$older = $older === false ? null : date("m/d/Y", $older);
			$newer = $newer === false ? null : date("m/d/Y", $newer);
			
			if(
				$older !== null ||
				$newer !== null
			){
				
				$tbs["cdr"] = "1";
				$tbs["cd_min"] = $newer;
				$tbs["cd_max"] = $older;
			}
			
			// relevance
			if($sort == "date"){
				
				$tbs["sbd"] = "1";
			}
					
			// append tbs
			if(count($tbs) !== 0){
				
				$params["tbs"] = "";
				
				foreach($tbs as $key => $value){
					
					$params["tbs"] .= $key . ":" . $value . ",";
				}
				
				$params["tbs"] = rtrim($params["tbs"], ",");
			}
			
			//$html = file_get_contents("scraper/google-news.html");
			
			$html =
				$this->get(
					$proxy,
					"https://www.google.com/search",
					$params
				);
		}
		
		$out = [
			"status" => "ok",
			"npt" => null,
			"news" => []
		];
		
		$this->fuckhtml->load($html);
		
		$this->detect_sorry();
		
		// get images
		$this->scrape_dimg($html);
		
		// parse styles
		$this->parsestyles();
		
		$center_col =
			$this->fuckhtml
			->getElementById(
				"center_col",
				"div"
			);
		
		if($center_col === null){
			
			throw new Exception("Could not grep result div");
		}
		
		$this->fuckhtml->load($center_col);
		
		// get next page
		$npt =
			$this->fuckhtml
			->getElementById(
				"pnnext",
				"a"
			);
		
		if($npt !== false){
			
			$out["npt"] =
				$this->backend->store(
					$this->fuckhtml
					->getTextContent(
						$npt["attributes"]
						["href"]
					),
					"news",
					$proxy
				);
		}
		
		$as =
			$this->fuckhtml
			->getElementsByAttributeName(
				"jsname",
				"a"
			);
		
		foreach($as as $a){
			
			$this->fuckhtml->load($a);
			
			// get title
			$title =
				$this->fuckhtml
				->getElementsByAttributeValue(
					"role",
					"heading",
					"div"
				);
			
			if(count($title) === 0){
				
				continue;
			}
			
			$title =
				$this->titledots(
					$this->fuckhtml
					->getTextContent(
						$title[0]
					)
				);
			
			// get thumbnail
			$image =
				$this->fuckhtml
				->getElementsByAttributeName(
					"id",
					"img"
				);
			
			// check for padded title node, if found, we're inside a carousel
			$probe =
				$this->fuckhtml
				->getElementsByClassName(
					$this->getstyle(
						[
							"padding" => "16px 16px 40px 16px"
						]
					),
					"div"
				);
			
			if(count($probe) !== 0){
				
				$probe = true;
			}else{
				
				$probe = false;
			}
			
			if(
				count($image) !== 0 &&
				!isset($image[0]["attributes"]["width"])
			){
				
				$thumb = [
					"url" =>
						$this->getdimg(
							$image[0]["attributes"]["id"]
						),
					"ratio" => $probe === true ? "16:9" : "1:1"
				];
			}else{
				
				$thumb = [
					"url" => null,
					"ratio" => null
				];
			}
			
			$description = null;
			
			if($probe === false){
				
				$desc_divs =
					$this->fuckhtml
					->getElementsByAttributeName(
						"style",
						"div"
					);
				
				foreach($desc_divs as $desc){
					
					if(
						strpos(
							$desc["attributes"]["style"],
							"margin-top:"
						) !== false
					){
						
						$description =
							$this->titledots(
								$this->fuckhtml
								->getTextContent(
									$desc
								)
							);
						break;
					}
				}
			}
			
			// get author
			$author =
				$this->fuckhtml
				->getElementsByClassName(
					$this->getstyle(
						[
							"overflow" => "hidden",
							"text-align" => "left",
							"text-overflow" => "ellipsis",
							"white-space" => "nowrap",
							"margin-bottom" => "8px"
						]
					),
					"div"
				);
			
			if(count($author) !== 0){
				
				$author =
					$this->fuckhtml
					->getTextContent(
						$author[0]
					);
			}else{
				
				$author = null;
			}
			
			// get date
			$date = null;
			
			$date_div =
				$this->fuckhtml
				->getElementsByAttributeName(
					"style",
					"div"
				);
			
			foreach($date_div as $d){
				
				$this->fuckhtml->load($d);
				
				$span =
					$this->fuckhtml
					->getElementsByTagName(
						"span"
					);
				
				if(
					strpos(
						$d["attributes"]["style"],
						"bottom:"
					) !== false
				){
					
					$date =
						strtotime(
							$this->fuckhtml
							->getTextContent(
								$span[count($span) - 1]
							)
						);
					break;
				}
			}
			
			$out["news"][] = [
				"title" => $title,
				"author" => $author,
				"description" => $description,
				"date" => $date,
				"thumb" => $thumb,
				"url" =>
					$this->unshiturl(
						$a["attributes"]
						["href"]
					)
			];
		}
		
		return $out;
	}
	
	
	public function image($get){
		
		// generate parameters
		if($get["npt"]){
			
			[$params, $proxy] =
				$this->backend->get(
					$get["npt"],
					"images"
				);
			
			$params = json_decode($params, true);
		}else{
			
			$search = $get["s"];
			if(strlen($search) === 0){
			
				throw new Exception("Search term is empty!");
			}
			
			$proxy = $this->backend->get_ip();
			$country = $get["country"];
			$nsfw = $get["nsfw"];
			$time = $get["time"];
			$size = $get["size"];
			$ratio = $get["ratio"];
			$color = $get["color"];
			$type = $get["type"];
			$format = $get["format"];
			$rights = $get["rights"];
			
			$params = [
				"q" => $search,
				"udm" => "2" // get images
			];
			
			// country (image search uses cr instead of gl)
			if($country != "any"){
				
				$params["cr"] = "country" . strtoupper($country);
			}
			
			// nsfw
			$params["safe"] = $nsfw == "yes" ? "off" : "active";
			
			// generate tbs
			$tbs = [];
			
			// time
			if($time != "any"){
				
				$tbs["qdr"] = $time;
			}
			
			// size
			if($size != "any"){
				
				$params["imgsz"] = $size;
			}
			
			// ratio
			if($ratio != "any"){
				
				$params["imgar"] = $ratio;
			}
			
			// color
			if($color != "any"){
				
				if(
					$color == "color" ||
					$color == "trans"
				){
					
					$params["imgc"] = $color;
				}elseif($color == "bnw"){
					
					$params["imgc"] = "gray";
				}else{
					
					$tbs["ic"] = "specific";
					$tbs["isc"] = $color;
				}
			}
			
			// type
			if($type != "any"){
				
				$tbs["itp"] = $type;
			}
			
			// format
			if($format != "any"){
				
				$params["as_filetype"] = $format;
			}
			
			// rights (tbs)
			if($rights != "any"){
				
				$tbs["sur"] = $rights;
			}
			
			// append tbs
			if(count($tbs) !== 0){
				
				$params["tbs"] = "";
				
				foreach($tbs as $key => $value){
					
					$params["tbs"] .= $key . ":" . $value . ",";
				}
				
				$params["tbs"] = rtrim($params["tbs"], ",");
			}
		}
		/*
		$handle = fopen("scraper/page.html", "r");
		$html = fread($handle, filesize("scraper/page.html"));
		fclose($handle);*/
		
		try{
			$html = 
				$this->get(
					$proxy,
					"https://www.google.com/search",
					$params
				);
		}catch(Exception $error){
			
			throw new Exception("Failed to get search page");
		}
		
		$this->fuckhtml->load($html);
		
		$this->detect_sorry();
		
		// get javascript images
		$this->scrape_imagearr($html);
		
		$out = [
			"status" => "ok",
			"npt" => null,
			"image" => []
		];
		
		$images =
			$this->fuckhtml
			->getElementsByClassName(
				"ivg-i",
				"div"
			);
		
		foreach($images as $div){
			
			$this->fuckhtml->load($div);
			
			$image =
				$this->fuckhtml
				->getElementsByTagName("img")[0];
			
			// make sure we dont attempt to show an image we dont have data for
			if(
				isset($div["attributes"]["data-docid"]) &&
				isset($this->image_arr[$div["attributes"]["data-docid"]])
			){
				
				$source =
					$this->image_arr[
						$div["attributes"]["data-docid"]
					];
			}else{
				
				continue;
			}
			
			$out["image"][] = [
				"title" =>
					$this->titledots(
						$this->fuckhtml
						->getTextContent(
							$image["attributes"]["alt"]
						)
					),
				"source" => $source,
				"url" =>
					$this->fuckhtml
					->getTextContent(
						$div["attributes"]["data-lpage"]
					)
			];
		}
		
		// as usual, no way to check if there is a next page reliably
		if(count($out["image"]) > 50){
			
			if(!isset($params["start"])){
				
				$params["start"] = 10;
			}else{
				
				$params["start"] += 10;
			}
			
			$out["npt"] =
				$this->backend
				->store(
					json_encode($params),
					"image",
					$proxy
				);
		}
		
		return $out;
	}
	
	
	private function scrape_dimg($html){
		
		// get images loaded through javascript
		$this->dimg = [];
		
		preg_match_all(
			'/function\(\){google\.ldi=({.*?});/',
			$html,
			$dimg
		);
		
		if(isset($dimg[1])){
			
			foreach($dimg[1] as $i){
				
				$tmp = json_decode($i, true);
				foreach($tmp as $key => $value){
					
					$this->dimg[$key] =
						$this->unshit_thumb(
							$value
						);
				}
			}
		}
		
		// get additional javascript base64 images
		preg_match_all(
			'/var s=\'(data:image\/[^\']+)\';var ii=\[((?:\'[^\']+\',?)+)\];/',
			$html,
			$dimg
		);
		
		if(isset($dimg[1])){
			
			for($i=0; $i<count($dimg[1]); $i++){
				
				$delims = explode(",", $dimg[2][$i]);
				$string =
					$this->fuckhtml
					->parseJsString(
						$dimg[1][$i]
					);
				
				foreach($delims as $delim){
					
					$this->dimg[trim($delim, "'")] = $string;
				}
			}
		}
	}
	
	
	private function scrape_imagearr($html){
		// get image links arrays
		preg_match_all(
			'/\[[0-9]+,"([^"]+)",\["([^"]+)\",([0-9]+),([0-9]+)\],\["([^"]+)",([0-9]+),([0-9]+)\]/',
			$html,
			$image_arr
		);
		
		$this->image_arr = [];
		if(isset($image_arr[1])){
			
			for($i=0; $i<count($image_arr[1]); $i++){
				
				$original =
					$this->fuckhtml
					->parseJsString(
						$image_arr[5][$i]
					);
				
				if(
					preg_match(
						'/^x-raw-image/',
						$original
					)
				){
					
					// only add thumbnail, google doesnt have OG resolution
					$this->image_arr[$image_arr[1][$i]] = [
						[
							"url" =>
								$this->unshit_thumb(
									$this->fuckhtml
									->parseJsString(
										$image_arr[2][$i]
									)
								),
							"width" => (int)$image_arr[7][$i], // pass the OG image width & height
							"height" => (int)$image_arr[6][$i]
						]
					];
					
					continue;
				}
				
				$this->image_arr[$image_arr[1][$i]] =
					[
						[
							"url" => $original,
							"width" => (int)$image_arr[7][$i],
							"height" => (int)$image_arr[6][$i]
						],
						[
							"url" =>
								$this->unshit_thumb(
									$this->fuckhtml
									->parseJsString(
										$image_arr[2][$i]
									)
								),
							"width" => (int)$image_arr[4][$i],
							"height" => (int)$image_arr[3][$i]
						]
					];
			}
		}
	}
	
	
	private function getdimg($dimg){
		
		return isset($this->dimg[$dimg]) ? $this->dimg[$dimg] : null;
	}
	
	
	private function unshit_thumb($url, $get_bigger_res = false){
		// https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQINE2vbnNLHXqoZr3RVsaEJFyOsj1_BiBnJch-e1nyz3oia7Aj5xVj
		// https://i.ytimg.com/vi/PZVIyA5ER3Y/mqdefault.jpg?sqp=-oaymwEFCJQBEFM&rs=AMzJL3nXeaCpdIar-ltNwl82Y82cIJfphA
		
		$parts = parse_url($url);
		
		if(
			isset($parts["host"]) &&
			preg_match(
				'/(?:encrypted-)?tbn.*\.gstatic\.com/',
				$parts["host"]
			)
		){
			
			parse_str($parts["query"], $params);
			
			if(isset($params["q"])){
				
				if($get_bigger_res){
					
					// this method doesnt always work, but does work for wiki thumbnails
					return
						"https://" . $parts["host"] . "/images?q=tbn:" .
						$this->base64url_encode(
							substr(
								$this->base64url_decode(
									explode(
										":",
										$params["q"])[1]
									),
								0,
								29
							)
						);
				}else{
					
					return "https://" . $parts["host"] . "/images?q=" . $params["q"];
				}
			}
		}
		
		return $url;
	}
	
	
	private function parsestyles(){
		
		$styles = [];

		$style_div =
			$this->fuckhtml
			->getElementsByTagName(
				"style"
			);
		
		$raw_styles = "";
		
		foreach($style_div as $style){
			
			$raw_styles .= $style["innerHTML"];
		}
		
		// filter out media/keyframe queries
		$raw_styles =
			preg_replace(
				'/@\s*(?!font-face)[^{]+\s*{[\S\s]+?}\s*}/',
				"",
				$raw_styles
			);
		
		// get styles
		preg_match_all(
			'/(.+?){([\S\s]*?)}/',
			$raw_styles,
			$matches
		);
		
		for($i=0; $i<count($matches[1]); $i++){
			
			// get style values
			preg_match_all(
				'/([^:;]+):([^;]*?(?:\([^)]+\)[^;]*?)?)(?:;|$)/',
				$matches[2][$i],
				$values_regex
			);
			
			$values = [];
			for($k=0; $k<count($values_regex[1]); $k++){
				
				$values[trim($values_regex[1][$k])] =
					strtolower(trim($values_regex[2][$k]));
			}
			
			$names = explode(",", $matches[1][$i]);
			
			// h1,h2,h3 will each get their own array index
			foreach($names as $name){
				
				$name = trim($name, "}\t\n\r\0\x0B");
				
				foreach($values as $key => $value){
					
					$styles[$name][$key] = $value;
				}
			}
		}
		
		foreach($styles as $key => $values){
			
			$styles[$key]["_c"] = count($values);
		}
		
		$this->styles = $styles;
		
		// get CSS colors
		$this->css_colors = [];
		
		if(isset($this->styles[":root"])){
			
			foreach($this->styles[":root"] as $key => $value){
				
				$this->css_colors[$value] = strtolower($key);
			}
		}
	}
	
	
	private function getstyle($styles){
		
		$styles["_c"] = count($styles);
		
		foreach($this->styles as $style_key => $style_values){
			
			if(count(array_intersect_assoc($style_values, $styles)) === $styles["_c"] + 1){
				
				$style_key =
					explode(" ", $style_key);
				
				$style_key = $style_key[count($style_key) - 1];
				
				return
					ltrim(
						str_replace(
							[".", "#"],
							" ",
							$style_key
						)
					);
			}
		}
		
		return false;
	}
	
	
	
	private function getcolorvar($color){
		
		if(isset($this->css_colors[$color])){
			
			return $this->css_colors[$color];
		}
		
		return null;
	}
	
	
	private function unshiturl($url, $return_size = false){
		
		// decode
		$url =
			$this->fuckhtml
			->getTextContent(
				$url
			);
		
		$url_parts = parse_url($url);
		
		if(isset($url_parts["query"])){
			
			parse_str($url_parts["query"], $query);
		}else{
			
			$query = [];
		}
		
		if(
			!isset(
				$url_parts["host"]
			) ||
			stripos($url_parts["host"], "google.") !== false
		){
			
			// no host, we have a tracking url
			if(isset($query["imgurl"])){
				
				$url = $query["imgurl"];
			}
			elseif(isset($query["q"])){
				
				$url = $query["q"];
			}
		}
		
		// rewrite URLs to remove extra tracking parameters
		$domain = parse_url($url, PHP_URL_HOST);
		
		if(
			preg_match(
				'/wikipedia.org$/',
				$domain
			)
		){
			
			// rewrite wikipedia mobile URLs to desktop
			$url =
				$this->replacedomain(
					$url,
					preg_replace(
						'/([a-z0-9]+)(\.m\.)/',
						'$1.',
						$domain
					)
				);
		}
		
		elseif(
			preg_match(
				'/imdb\.com$|youtube\.[^.]+$/',
				$domain
			)
		){
			
			// rewrite imdb and youtube mobile URLs too
			$url =
				$this->replacedomain(
					$url,
					preg_replace(
						'/^m\./',
						"",
						$domain
					)
				);
			
		}
		
		elseif(
			preg_match(
				'/play\.google\.[^.]+$/',
				$domain
			)
		){
			
			// remove referrers from play.google.com
			$u_query = parse_url($url, PHP_URL_QUERY);
			if($u_query !== null){
				
				parse_str($u_query, $u_query);
				if(isset($u_query["referrer"])){ unset($u_query["referrer"]); }
				if(isset($u_query["hl"])){ unset($u_query["hl"]); }
				if(isset($u_query["gl"])){ unset($u_query["gl"]); }
				
				$query = http_build_query($query);
				
				$url =
					str_replace(
						$u_query,
						$u_query,
						$url
					);
			}
		}
		
		elseif(
			preg_match(
				'/twitter\.com$/',
				$domain
			)
		){
			// remove more referrers from twitter.com
			$u_query = parse_url($url, PHP_URL_QUERY);
			if($u_query !== null){
				
				parse_str($u_query, $u_query);
				if(isset($u_query["ref_src"])){ unset($u_query["ref_src"]); }
				
				$u_query = http_build_query($u_query);
				
				$url =
					str_replace(
						$oldquery,
						$u_query,
						$url
					);
			}
		}
		
		elseif(
			preg_match(
				'/maps\.google\.[^.]+/',
				$domain
			)
		){
			
			if(stripos($url, "maps?") !== false){
				
				$u_query = parse_url($url, PHP_URL_QUERY);

				if($u_query !== null){
					
					parse_str($u_query, $u_query);
					
					if(isset($u_query["daddr"])){
						
						$url =
							"https://maps.google.com/maps?daddr=" .
							urlencode($u_query["daddr"]);
					}
				}
			}
		}
		
		if($return_size){
			
			return [
				"url" => $url,
				"ref" => isset($query["imgrefurl"]) ? $query["imgrefurl"] : null,
				"thumb_width" => isset($query["tbnw"]) ? (int)$query["tbnw"] : null,
				"thumb_height" => isset($query["tbnh"]) ? (int)$query["tbnh"] : null,
				"image_width" => isset($query["w"]) ? (int)$query["w"] : null,
				"image_height" => isset($query["h"]) ? (int)$query["h"] : null
			];
		}
		
		return $url;
	}
	
	private function replacedomain($url, $domain){
		
		return
			preg_replace(
				'/(https?:\/\/)([^\/]+)/',
				'$1' . $domain,
				$url
			);
	}
	
	private function titledots($title){
		
		return trim($title, " .\t\n\r\0\x0B…");
	}
	
	private function hms2int($time){
		
		$parts = explode(":", $time, 3);
		$time = 0;
		
		if(count($parts) === 3){
			
			// hours
			$time = $time + ((int)$parts[0] * 3600);
			array_shift($parts);
		}
		
		if(count($parts) === 2){
			
			// minutes
			$time = $time + ((int)$parts[0] * 60);
			array_shift($parts);
		}
		
		// seconds
		$time = $time + (int)$parts[0];
		
		return $time;
	}
	
	function base64url_decode($data){
		
		$b64 = strtr($data, "-_", "+/");
		$pad = strlen($b64) % 4;
		if ($pad) $b64 .= str_repeat("=", 4 - $pad);
		
		return base64_decode($b64);
	}

	function base64url_encode($data){
		
		return rtrim(strtr(base64_encode($data), "+/", "-_"), "=");
	}
	
	private function detect_sorry(){
		
		$captcha_form =
			$this->fuckhtml
			->getElementById(
				"captcha-form",
				"form"
			);
		
		if($captcha_form !== false){
			
			throw new Exception("Google returned a captcha");
		}
	}
}
