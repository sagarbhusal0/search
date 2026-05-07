<?php

class frontend{
	
	public function validateurl($url, $net_validate = false){
		
		$url_parts = parse_url($url);
		
		// check if required parts are there
		if(
			!isset($url_parts["scheme"]) ||
			!(
				$url_parts["scheme"] == "http" ||
				$url_parts["scheme"] == "https"
			) ||
			!isset($url_parts["host"])
		){
			return false;
		}
		
		if($net_validate){
			$ip = 
				str_replace(
					["[", "]"], // handle ipv6
					"",
					$url_parts["host"]
				);
			
			// if its not an IP
			if(!filter_var($ip, FILTER_VALIDATE_IP)){
				
				// resolve domain's IP
				$ip = gethostbyname($url_parts["host"] . ".");
			}
			
			// check if its localhost
			if(
				filter_var(
					$ip,
					FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE
				) === false
			){
				
				return false;
			}
		}
		
		return true;
	}
	
	public function load($template, $replacements = []){
		
		$replacements["server_name"] = htmlspecialchars(config::SERVER_NAME);
		$replacements["version"] = config::VERSION;
		
		if(isset($_COOKIE["theme"])){
			
			$theme = str_replace(["/". "."], "", $_COOKIE["theme"]);
			
			if(
				$theme != "Dark" &&
				!is_file("static/themes/" . $theme . ".css")
			){
				
				$theme = config::DEFAULT_THEME;
			}
		}else{
			
			$theme = config::DEFAULT_THEME;
		}
		
		if($theme != "Dark"){
			
			$replacements["style"] = '<link rel="stylesheet" href="/static/themes/' . rawurlencode($theme) . '.css?v' . config::VERSION . '">';
		}else{
			
			$replacements["style"] = "";
		}
		
		if(isset($_COOKIE["scraper_ac"])){
			
			$replacements["ac"] = '?ac=' . htmlspecialchars($_COOKIE["scraper_ac"]);
		}else{
			
			$replacements["ac"] = '';
		}
		
		if(
			isset($replacements["timetaken"]) &&
			$replacements["timetaken"] !== null
		){
			
			$replacements["timetaken"] = '<div class="timetaken">Took ' . number_format(microtime(true) - $replacements["timetaken"], 2) . 's</div>';
		}
		
		$handle = fopen("template/{$template}", "r");
		$data = fread($handle, filesize("template/{$template}"));
		fclose($handle);
		
		$data = explode("\n", $data);
		$html = "";
		
		for($i=0; $i<count($data); $i++){
			
			$html .= trim($data[$i]);
		}
		
		foreach($replacements as $key => $value){
		
			$html =
				str_replace(
					"{%{$key}%}",
					$value,
					$html
				);
		}
		
		return trim($html);
	}
	
	public function loadheader(array $get, array $filters, string $page){
		
		echo
			$this->load("header.html", [
				"title" => trim(htmlspecialchars($get["s"]) . " ({$page})"),
				"description" => ucfirst($page) . ' search results for &quot;' . htmlspecialchars($get["s"]) . '&quot;',
				"index" => "no",
				"search" => htmlspecialchars($get["s"]),
				"tabs" => $this->generatehtmltabs($page, $get),
				"filters" => $this->generatehtmlfilters($filters, $get)
			]);
		
		$headers_raw = getallheaders();
		$header_keys = [];
		$user_agent = "";
		$bad_header = false;
		
		// block bots that present X-Forwarded-For, Via, etc
		foreach($headers_raw as $headerkey => $headervalue){
			
			$headerkey = strtolower($headerkey);
			if($headerkey == "user-agent"){
				
				$user_agent = $headervalue;
				continue;
			}
			
			// check header key
			if(in_array($headerkey, config::FILTERED_HEADER_KEYS)){
				
				$bad_header = true;
				break;
			}
		}
		
		// SSL check
		$bad_ssl = false;
		if(
			isset($_SERVER["https"]) &&
			$_SERVER["https"] == "on" &&
			isset($_SERVER["SSL_CIPHER"]) &&
			in_array($_SERVER["SSL_CIPHER"], config::FILTERED_HEADER_KEYS)
		){
			
			$bad_ssl = true;
		}
		
		if(
			$bad_header === true ||
			$bad_ssl === true ||
			$user_agent == "" ||
			// user agent check
			preg_match(
				config::HEADER_REGEX,
				$user_agent
			)
		){
			
			// bot detected !!
			apcu_inc("captcha_gen");
			
			$this->drawerror(
				"Tshh, blocked!",
				'Your browser, IP or IP range has been blocked from this 4get instance. If this is an error, please <a href="/about">contact the administrator</a>.'
			);
			die();
		}
	}
	
	public function drawerror($title, $error, $timetaken = null){
		
		if($timetaken === null){
			
			$timetaken = microtime(true);
		}
		
		echo
			$this->load("search.html", [
				"timetaken" => $timetaken,
				"class" => "",
				"right-left" => "",
				"right-right" => "",
				"left" =>
					'<div class="infobox">' .
						'<h1>' . htmlspecialchars($title) . '</h1>' .
						$error .
					'</div>'
			]);
		die();
	}
	
	public function drawscrapererror($error, $get, $target, $timetaken = null){
		
		if($timetaken === null){
			
			$timetaken = microtime(true);
		}
		
		$this->drawerror(
			"Shit",
			'This scraper returned an error:' .
			'<div class="code">' . htmlspecialchars($error) . '</div>' .
			'Things you can try:' .
			'<ul>' . 
				'<li>Use a different scraper</li>' .
				'<li>Remove keywords that could cause errors</li>' .
				'<li><a href="/instances?target=' . $target . "&" . $this->buildquery($get, false) . '">Try your search on another 4get instance</a></li>' .
			'</ul><br>' .
			'If the error persists, please <a href="/about">contact the administrator</a>.',
			$timetaken
		);
	}
	
	public function drawtextresult($site, $greentext = null, $duration = null, $keywords, $tabindex = true, $customhtml = null){
		
		$payload =
			'<div class="text-result">';
		
		// add favicon, link and archive links
		$payload .= $this->drawlink($site["url"]);
		
		/*
			Draw title + description + filetype
		*/
		$payload .=
			'<a href="' . htmlspecialchars($site["url"]) . '" class="hover" rel="noreferrer nofollow"';
			
		if($tabindex === false){
			
			$payload .= ' tabindex="-1"';
		}
			
		$payload .= '>';
			
			if($site["thumb"]["url"] !== null){
				
				$payload .=
					'<div class="thumb-wrap';
				
				switch($site["thumb"]["ratio"]){
					
					case "16:9":
						$size = "landscape";
						break;
					
					case "9:16":
						$payload .= " portrait";
						$size = "portrait";
						break;
					
					case "1:1":
						$payload .= " square";
						$size = "square";
						break;
				}
				
				$payload .=
					'">' .
						'<img class="thumb" src="' . $this->htmlimage($site["thumb"]["url"], $size) . '" alt="thumb">';
				
				if($duration !== null){
					
					$payload .=
						'<div class="duration">' .
							htmlspecialchars($duration) .
						'</div>';
				}
				
				$payload .=
					'</div>';
			}
			
		$payload .=
			'<div class="title">';
		
		if(
			isset($site["type"]) &&
			$site["type"] != "web"
		){
			
			$payload .= '<div class="type">' . strtoupper($site["type"]) . '</div>';
		}
		
		$payload .=
			$this->highlighttext($keywords, $site["title"]) .
		'</div>';
		
		if($greentext !== null){
			
			$payload .=
				'<div class="greentext">' .
					htmlspecialchars($greentext) .
				'</div>';
		}
		
		if($site["description"] !== null){
			
			$payload .=
				'<div class="description">' .
					$this->highlighttext($keywords, $site["description"]) .
				'</div>';
		}
		
		$payload .= $customhtml;
		
		$payload .= '</a>';
		
		/*
			Sublinks
		*/
		if(
			isset($site["sublink"]) &&
			!empty($site["sublink"])
		){
			
			usort($site["sublink"], function($a, $b){
				
				return strlen($a["description"]) > strlen($b["description"]);
			});
			
			$payload .=
				'<div class="sublinks">' .
					'<table>';
			
			$opentr = false;
			for($i=0; $i<count($site["sublink"]); $i++){
				
				if(($i % 2) === 0){
					
					$opentr = true;
					$payload .= '<tr>';
				}else{
					
					$opentr = false;
				}
				
				$payload .=
					'<td>' .
						'<a href="' . htmlspecialchars($site["sublink"][$i]["url"]) . '" rel="noreferrer nofollow">' .
							'<div class="title">' .
								htmlspecialchars($site["sublink"][$i]["title"]) .
							'</div>';
				
				if(!empty($site["sublink"][$i]["date"])){
					
					$payload .=
						'<div class="greentext">' .
							date("jS M y @ g:ia", $site["sublink"][$i]["date"]) .
						'</div>';
				}
				
				if(!empty($site["sublink"][$i]["description"])){
					
					$payload .=
						'<div class="description">' .
							$this->highlighttext($keywords, $site["sublink"][$i]["description"]) .
						'</div>';
				}
				
				$payload .= '</a></td>';
				
				if($opentr === false){
					
					$payload .= '</tr>';
				}
			}
			
			if($opentr === true){
				
				$payload .= '<td></td></tr>';
			}
			
			$payload .= '</table></div>';
		}
		
		if(
			isset($site["table"]) &&
			!empty($site["table"])
		){
			
			$payload .= '<table class="info-table">';
			
			foreach($site["table"] as $title => $value){
				
				$payload .=
					'<tr>' .
						'<td>' . htmlspecialchars($title) . '</td>' .
						'<td>' . htmlspecialchars($value) . '</td>' .
					'</tr>';
			}
			
			$payload .= '</table>';
		}
		
		return $payload . '</div>';
	}
	
	public function highlighttext($keywords, $text){
		
		$text = htmlspecialchars($text);
		
		$keywords = explode(" ", $keywords);
		$regex = [];
		
		foreach($keywords as $word){
			
			$regex[] = "\b" . preg_quote($word, "/") . "\b";
		}
		
		$regex = "/" . implode("|", $regex) . "/i";
		
		return
			preg_replace(
				$regex,
				'<b>${0}</b>',
				$text
			);
	}
	
	function highlightcode($text){
		
		// https://www.php.net/highlight_string
		ini_set("highlight.comment", "c-comment");
		ini_set("highlight.default", "c-default");
		ini_set("highlight.html", "c-default");
		ini_set("highlight.keyword", "c-keyword");
		ini_set("highlight.string", "c-string");
		
		$text =
			trim(
				preg_replace(
					'/<code [^>]+>/',
					"",
					str_replace(
						[
							"<br />",
							"&nbsp;",
							"<pre>",
							"</pre>",
							"</code>"
						],
						[
							"\n",
							" ",
							"",
							"",
							""
						],
						explode(
							"&lt;?php",
							highlight_string("<?php " . $text, true),
							2
						)[1]
					)
				)
			);
		
		// replace colors
		$classes = ["c-comment", "c-default", "c-keyword", "c-string"];
		
		foreach($classes as $class){
			
			$text = str_replace('<span style="color: ' . $class . '">', '<span class="' . $class . '">', $text);
		}
		
		return $text;
	}
	
	public function drawlink($link){
		
		/*
			Add favicon
		*/
		$host = parse_url($link);
		
		// special case for when we're not drawing a full url
		if(!isset($host["host"])){
			
			$payload =
				'<div class="url">' .
					'<button class="favicon" tabindex="-1">' .
						'<img src="/favicon?s=404" alt="xx">' .
					'</button>';
		}else{
			
			$esc =
				explode(
					".",
					$host["host"],
					2
				);
			
			if(
				count($esc) === 2 &&
				$esc[0] == "www"
			){
				
				$esc = $esc[1];
			}else{
				
				$esc = $esc[0];
			}
			
			$esc = substr($esc, 0, 2);
			
			$urlencode = urlencode($link);
			
			$payload =
				'<div class="url">' .
					'<button class="favicon" tabindex="-1">' .
						'<img src="/favicon?s=' . htmlspecialchars($host["scheme"] . "://" . $host["host"]) . '" alt="' . htmlspecialchars($esc) . '">' .
						//'<img src="/404.php" alt="' . htmlspecialchars($esc) . '">' .
					'</button>' .
					'<div class="favicon-dropdown">';
			
			$payload .=
					'<a href="https://web.archive.org/web/' . $urlencode . '" class="list" target="_BLANK"><img src="/favicon?s=https://archive.org" alt="ar">Archive.org</a>' .
					'<a href="https://archive.ph/newest/' . htmlspecialchars($link) . '" class="list" target="_BLANK"><img src="/favicon?s=https://archive.is" alt="ar">Archive.is</a>' .
					'<a href="https://ghostarchive.org/search?term=' . $urlencode . '" class="list" target="_BLANK"><img src="/favicon?s=https://ghostarchive.org" alt="gh">Ghostarchive</a>' .
					'<a href="https://arquivo.pt/wayback/' . htmlspecialchars($link) . '" class="list" target="_BLANK"><img src="/favicon?s=https://arquivo.pt" alt="ar">Arquivo.pt</a>' .
					'<a href="https://www.bing.com/search?q=url%3A' . $urlencode . '" class="list" target="_BLANK"><img src="/favicon?s=https://bing.com" alt="bi">Bing cache</a>' .
					'<a href="https://megalodon.jp/?url=' . $urlencode . '" class="list" target="_BLANK"><img src="/favicon?s=https://megalodon.jp" alt="me">Megalodon</a>' .
				'</div>';
		}
		
		/*
			Draw link
		*/
		$parts = explode("/", $link);
		$clickurl = "";
		
		// remove trailing /
		$c = count($parts) - 1;
		if($parts[$c] == ""){
			
			$parts[$c - 1] = $parts[$c - 1] . "/";
			unset($parts[$c]);
		}
		
		// merge https://site together
		if(isset($host["host"])){
			$parts = [
				$parts[0] . $parts[1] . '//' . $parts[2],
				...array_slice($parts, 3, count($parts) - 1)
			];
		}
		
		$c = count($parts);
		for($i=0; $i<$c; $i++){
			
			if($i !== 0){ $clickurl .= "/"; }
			
			$clickurl .= $parts[$i];
			
			if($i === $c - 1){
				
				$parts[$i] = rtrim($parts[$i], "/");
			}
			
			$payload .=
				'<a class="part" href="' . htmlspecialchars($clickurl) . '" rel="noreferrer nofollow" tabindex="-1">' .
					htmlspecialchars(urldecode($parts[$i])) .
				'</a>';
			
			if($i !== $c - 1){
				
				$payload .= '<span class="separator"></span>';
			}
		}
		
		return $payload . '</div>';
	}
	
	public function getscraperfilters($page){
		
		$get_scraper = isset($_COOKIE["scraper_$page"]) ? $_COOKIE["scraper_$page"] : null;
		
		if(
			isset($_GET["scraper"]) &&
			is_string($_GET["scraper"])
		){
			
			$get_scraper = $_GET["scraper"];
		}else{
			
			if(
				isset($_GET["npt"]) &&
				is_string($_GET["npt"])
			){
				
				$get_scraper = explode(".", $_GET["npt"], 2)[0];
				
				$get_scraper =
					preg_replace(
						'/[0-9]+$/',
						"",
						$get_scraper
					);
			}
		}
		
		// add search field
		$filters =
			[
				"s" => [
					"option" => "_SEARCH"
				]
			];
		
		// define default scrapers
		switch($page){
			
			case "web":
				$filters["scraper"] = [
					"display" => "Scraper",
					"option" => [
						"ddg" => "DuckDuckGo",
						//"yahoo" => "Yahoo!",
						"brave" => "Brave",
						"yandex" => "Yandex",
						"google" => "Google",
						"google_api" => "Google API",
						"google_cse" => "Google CSE",
						"yahoo_japan" => "Yahoo! JAPAN",
						"startpage" => "Startpage",
						"qwant" => "Qwant",
						"ghostery" => "Ghostery",
						"yep" => "Yep",
						"mwmbl" => "Mwmbl",
						"mojeek" => "Mojeek",
						"baidu" => "Baidu",
						"coccoc" => "Cốc Cốc",
						"solofield" => "Solofield",
						"marginalia" => "Marginalia",
						"wiby" => "wiby"
					]
				];
				break;
			
			case "images":
				$filters["scraper"] = [
					"display" => "Scraper",
					"option" => [
						"ddg" => "DuckDuckGo",
						"yandex" => "Yandex",
						"brave" => "Brave",
						"google" => "Google",
						"google_api" => "Google API",
						"google_cse" => "Google CSE",
						"yahoo_japan" => "Yahoo! JAPAN",
						"startpage" => "Startpage",
						"qwant" => "Qwant",
						"baidu" => "Baidu",
						"solofield" => "Solofield",
						"pinterest" => "Pinterest",
						"cara" => "Cara",
						"flickr" => "Flickr",
						"pexels" => "Pexels",
						"pixabay" => "Pixabay",
						"unsplash" => "Unsplash",
						"fivehpx" => "500px",
						"vsco" => "VSCO",
						"imgur" => "Imgur",
						"ftm" => "FindThatMeme"
					]
				];
				break;
			
			case "videos":
				$filters["scraper"] = [
					"display" => "Scraper",
					"option" => [
						"yt" => "YouTube",
						//"archiveorg" => "Archive.org",
						"vimeo" => "Vimeo",
						//"odysee" => "Odysee",
						"sepiasearch" => "Sepia Search",
						//"fb" => "Facebook videos",
						"ddg" => "DuckDuckGo",
						"brave" => "Brave",
						"yandex" => "Yandex",
						"google" => "Google",
						"yahoo_japan" => "Yahoo! JAPAN",
						"startpage" => "Startpage",
						"qwant" => "Qwant",
						"baidu" => "Baidu",
						"coccoc" => "Cốc Cốc",
						"solofield" => "Solofield"
					]
				];
				break;
			
			case "news":
				$filters["scraper"] = [
					"display" => "Scraper",
					"option" => [
						"ddg" => "DuckDuckGo",
						"brave" => "Brave",
						"google" => "Google",
						"yahoo_japan" => "Yahoo! JAPAN",
						"startpage" => "Startpage",
						"qwant" => "Qwant",
						"mojeek" => "Mojeek",
						"baidu" => "Baidu"
					]
				];
				break;
			
			case "music":
				$filters["scraper"] = [
					"display" => "Scraper",
					"option" => [
						"sc" => "SoundCloud",
						"swisscows" => "Swisscows (SoundCloud)"
						//"spotify" => "Spotify"
					]
				];
				break;
			
			case "booru":
				$filters["scraper"] = [
					"display" => "Scraper",
					"option" => [
						"safebooru" => "Safebooru",
						"konachan" => "Konachan",
						"tbib" => "The Big Imageboard",
						"gelbooru" => "Gelbooru",
						"yandere" => "Yande.re",
						"tbib" => "The Big Imageboard",
						"sankakucomplex" => "SankakuComplex",
						"soybooru" => "SoyBooru"
					]
				];
				break;
		}
		
		// get scraper name from user input, or default out to preferred scraper
		$scraper_out = null;
		$first = true;
		
		foreach($filters["scraper"]["option"] as $scraper_name => $scraper_pretty){
			
			if($first === true){
				
				$first = $scraper_name;
			}
			
			if($scraper_name == $get_scraper){
				
				$scraper_out = $scraper_name;
			}
		}
		
		if($scraper_out === null){
			
			$scraper_out = $first;
		}
		
		include "scraper/$scraper_out.php";
		$lib = new $scraper_out();
		
		// set scraper on $_GET
		$_GET["scraper"] = $scraper_out;
		
		// set nsfw on $_GET
		if(
			isset($_COOKIE["nsfw"]) &&
			!isset($_GET["nsfw"])
		){
			
			$_GET["nsfw"] = $_COOKIE["nsfw"];
		}
		
		return
			[
				$lib,
				array_merge_recursive(
					$filters,
					$lib->getfilters($page)
				)
			];
	}
	
	public function parsegetfilters($parameters, $whitelist){
		
		$sanitized = [];
		
		// add npt token
		if(
			isset($parameters["npt"]) &&
			is_string($parameters["npt"])
		){
			
			$sanitized["npt"] = $parameters["npt"];
		}else{
			
			$sanitized["npt"] = false;
		}
		
		// we're iterating over $whitelist, so
		// you can't polluate $sanitized with useless
		// parameters
		foreach($whitelist as $parameter => $value){
			
			if(isset($parameters[$parameter])){
				
				if(!is_string($parameters[$parameter])){
					
					$sanitized[$parameter] = null;
					continue;
				}
				
				// parameter is already set, use that value
				$sanitized[$parameter] = $parameters[$parameter];
			}else{
				
				// parameter is not set, add it
				if(is_string($value["option"])){
					
					// special field: set default value manually
					switch($value["option"]){
						
						case "_DATE":
							// no date set
							$sanitized[$parameter] = false;
							break;
						
						case "_SEARCH":
							// no search set
							$sanitized[$parameter] = "";
							break;
					}
					
				}else{
					
					// set a default value
					$sanitized[$parameter] = array_keys($value["option"])[0];
				}
			}
			
			// sanitize input
			if(is_array($value["option"])){
				if(
					!in_array(
						$sanitized[$parameter],
						$keys = array_keys($value["option"])
					)
				){
					
					$sanitized[$parameter] = $keys[0];
				}
			}else{
				
				// sanitize search & string
				switch($value["option"]){
					
					case "_DATE":
						if($sanitized[$parameter] !== false){
							
							$sanitized[$parameter] = strtotime($sanitized[$parameter]);
							if($sanitized[$parameter] <= 0){
								
								$sanitized[$parameter] = false;
							}
						}
						break;
					
					case "_SEARCH":
						// get search string
						$sanitized["s"] = trim($sanitized[$parameter]);
				}
			}
		}
		
		// invert dates if needed
		if(
			isset($sanitized["older"]) &&
			isset($sanitized["newer"]) &&
			$sanitized["newer"] !== false &&
			$sanitized["older"] !== false &&
			$sanitized["newer"] > $sanitized["older"]
		){
			
			// invert
			[
				$sanitized["older"],
				$sanitized["newer"]
			] = [
				$sanitized["newer"],
				$sanitized["older"]
			];
		}
		
		return $sanitized;
	}

	public function s_to_timestamp($seconds){
		
		if(is_string($seconds)){
			
			return "LIVE";
		}
		
		return ($seconds >= 60) ? ltrim(gmdate("H:i:s", $seconds), ":0") : gmdate("0:s", $seconds);
	}
	
	public function generatehtmltabs($page, $get){
		
		$html = null;
		$query = $get["s"];
		$params = "&" . $this->buildquery($get, true);

		$icons = [
			"web" => '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
			"images" => '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>',
			"videos" => '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg>',
			"news" => '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/></svg>',
			"music" => '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>'
		];
		
		//foreach(["web", "images", "videos", "news", "music", "booru"] as $type){
		foreach(["web", "images", "videos", "news", "music"] as $type){
			
			$html .= '<a href="/' . $type . '?s=' . urlencode($query);
			
			if(!empty($params)){
				
				$html .= $params;
			}
			
			$html .= '" class="tab';
			
			if($type == $page){
				
				$html .= ' selected';
			}
			
			$html .= '">' . $icons[$type] . ucfirst($type) . '</a>';
		}
		
		return $html;
	}
	
	public function generatehtmlfilters($filters, $params){
		
		$html = null;
		
		foreach($filters as $filter_name => $filter_values){
			
			if(!isset($filter_values["display"])){
				
				continue;
			}
			
			$output = true;
			$tmp =
				'<div class="filter">' .
					'<div class="title">' . htmlspecialchars($filter_values["display"]) . '</div>';
			
			if(is_array($filter_values["option"])){
				
				$tmp .= '<select name="' . $filter_name . '">';
				
				foreach($filter_values["option"] as $option_name => $option_title){
					
					$tmp .= '<option value="' . $option_name . '"';
					
					if($params[$filter_name] == $option_name){
						
						$tmp .= ' selected';
					}
					
					$tmp .= '>' . htmlspecialchars($option_title) . '</option>';
				}
				
				$tmp .= '</select>';
			}else{
				
				switch($filter_values["option"]){
					
					case "_DATE":
						$tmp .= '<input type="date" name="' . $filter_name . '"';
						
						if($params[$filter_name] !== false){
							
							$tmp .= ' value="' . date("Y-m-d", $params[$filter_name]) . '"';
						}
						
						$tmp .= '>';
						break;
					
					default:
						$output = false;
						break;
				}
			}
			
			$tmp .= '</div>';
			
			if($output === true){
				
				$html .= $tmp;
			}
		}
		
		return $html;
	}
	
	public function buildquery($gets, $ommit = false){
		
		$out = [];
		foreach($gets as $key => $value){
			
			if(
				$value === null ||
				$value === false ||
				$value === "" ||
				$key == "npt" ||
				$key == "extendedsearch" ||
				$value == "any" ||
				$value == "all" ||
				$key == "spellcheck" ||
				(
					$ommit === true &&
					$key == "s"
				)
			){
				
				continue;
			}
			
			if(
				$key == "older" ||
				$key == "newer"
			){
				
				$value = date("Y-m-d", (int)$value);
			}
			
			$out[$key] = $value;
		}
		
		return http_build_query($out);
	}
	
	public function htmlimage($image, $format){
		
		if(
			preg_match(
				'/^data:/',
				$image
			)
		){
			
			return htmlspecialchars($image);
		}
		
		//return "https://4get.ca/proxy?i=" . urlencode($image) . "&s=" . $format;
		return "/proxy?i=" . urlencode($image) . "&s=" . $format;
	}
	
	public function htmlnextpage($gets, $npt, $page){
		
		$query = $this->buildquery($gets);
		
		return $page . "?" . $query . "&npt=" . $npt;
	}
}
