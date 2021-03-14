#!/usr/local/bin/bash

#this script takes a file with a list of video urls and concatenates them into a single, compressed output .mp4 video
#run this script like "./concatVideosFromUrlList.sh ./myVideoUrlsDirectory" and all .txt files within will be made into a .mp4
#or run this script like "./concatVideosFromUrlList.sh ./myVideoUrlsFile.txt" for a single file
#where myVideoUrlsFile.txt is a newline-separated list of urls, starting with file
#eg:
#file https://www.example.com/myVideoUrl1
#file https://www.example.com/myVideoUrl2
#...

#round val numDigits => output
#round 1.654 2 => 1.65
function round()
{
  echo $(printf %."$2"f $(echo "scale=$2;(((10^$2)*$1)+0.5)/(10^$2)" | bc))
};

function getMinSec()
{
  local file=$1
  local duration=$(ffmpeg -i "${file}" 2>&1 | grep Duration | sed 's/Duration: \(.*\), start/\1/' | grep -o -E '[0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]{2}')
  local sec=$(round "$(echo "$duration" | grep -o -E '[0-9]{2}\.[0-9]{2}')" 0)
  local hour=$(echo "$duration" | grep -o -E '^[0-9]{2}')
  local min=$(echo "$duration" | sed -n -E "s/^$hour:([0-9]{2}).*/\1/p")
  echo "{m:$min,s:$sec},"
}

VIDEO_URLS_INPUT_PATH=$1
prefix=$2

function run()
{
  if [[ -d $VIDEO_URLS_INPUT_PATH ]]; then
    if [[ -n $prefix ]]; then
      echo "printing all video durations starting with $prefix"
    else
      echo "printing all video durations"
    fi
    files=($( ls "$VIDEO_URLS_INPUT_PATH" ))
    for ((i=0; i<${#files[@]}; i++)); do
      file="$VIDEO_URLS_INPUT_PATH/${files[$i]}"
      if ! [[ ${files[$i]} =~ ^"$prefix".*$ ]] || ! [[ ${files[$i]} =~ .*\.mp4 ]]; then
        continue
      fi
      echo "$(getMinSec "$file")"
    done
  else
    echo "printing video duration"
    file=$VIDEO_URLS_INPUT_PATH
    echo $(getMinSec "$file")
  fi
}

run
