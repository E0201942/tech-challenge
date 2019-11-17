const 
crypto = require('crypto'),
config = require('./config'),
NodeCache = require( "node-cache" ),
rp = require('request-promise');
var fs = require('fs');

var mycache = new NodeCache();



module.exports.home = async (req,res,next)=>{    
  let token = req.session.token;
  //Get name of the folder being navigated to
  path = req.url.replace("%20", " ");
  path = path.replace("?", "");
  var toRemove = true
  if(path.length == 1){
    path = path.replace("/", "");
  }
  if(token){
    try{
      let paths = await getLinksAsync(token, path); 
      let folderpath = await getFolderLinksAsync(token, '');
      path = path.replace("/", "");
      folderarr = {};
      currfolder ={}
      if(path != ""){
        folderarr["Home"] = "http://localhost:3000";
        currfolder[path] = "#";
      }
      else{
        currfolder["Home"] = "#";
      }
      emptyarr =[];
      if(paths.length == 0){
        emptyarr.push("/images/emptyalbum.jpg");
      }
      console.log(path)
      var del = "http://localhost:3000/delete/?" + path; 
      var arrayLength = folderpath["paths"].length;
      for (var i = 0; i < arrayLength; i++) {
        if(currfolder[folderpath["paths"][i].substr(1)] == null){
          folderarr[folderpath["paths"][i].substr(1)] = "http://localhost:3000/?" 
          + folderpath["paths"][i].replace(" ", "%20").replace("/", "");
        }
        //folderurls.push("http://localhost:3000/?" + folderpath["paths"][i].replace(" ", "%20"));
    //Do something
      }
        res.render('gallery', { empty: emptyarr, imgs: paths, folders: folderarr, curr: currfolder, del:del, path: path, layout:false});


    }catch(error){
      return next(new Error("Error getting images from Dropbox"));
    }

  }else{
    res.redirect('/login');
  }
}


module.exports.createfolder = async (req,res,next)=>{
  path = req.url.replace("createfolder", "")
  path = path.replace("/", "");
  path = path.replace("%20", " ");
  path = path.replace("?", "");
  console.log(path)
  try{
    let options={
    url: config.DBX_API_DOMAIN + config.DBX_CREATE_FOLDER_PATH, 
    headers:{"Authorization":"Bearer "+ req.session.token},
    method: 'POST',
    body: {"path": path, "autorename": false},
    json: true
  }
    let result = await rp(options);
    console.log("here")
  }catch(error){
    res.redirect('/');
    //return next(new Error('error adding folder. '+error.message));
  }  
  res.redirect('/');
}
//Delete the currently selected album
module.exports.delete = async (req,res,next)=>{
  path = req.url.replace("delete", "")
  path = path.replace("/", "");
  path = path.replace("%20", " ");
  path = path.replace("?", "");
  console.log(path)
  if(path.length > 1){
  try{
    let options={
    url: config.DBX_API_DOMAIN + config.DBX_DELETE_PATH, 
    headers:{"Authorization":"Bearer "+ req.session.token},
    method: 'POST',
    body: {"path": path},
    json: true
  }
    let result = await rp(options);
    res.redirect('/');
  }catch(error){
    return next(new Error('error adding folder. '+error.message));
  }  
}
}
module.exports.upload = async (req,res,next)=>{
  var localpath = "public/images/a.jpg";
  path = req.url.replace("upload", "")
  path = path.replace("/", "");
  path = path.replace("%20", " ");
  path = path.replace("?", "");
  path = path.replace("/", "");
  var content = fs.readFileSync(localpath);
  console.log(path)
  filename = "/new.jpg";
  try{
    let options={
    url: "https://content.dropboxapi.com/2/files/upload", 
    headers:{"Content-Type": "application/octet-stream","Authorization":"Bearer "+ req.session.token,
    "Dropbox-API-Arg":"{\"path\": \"/"+path+filename+"\",\"mode\": \"add\",\"autorename\": true,\"mute\": false}"
},
    method: 'POST',
    body: content
  };
    let result = await rp(options);
    path = "?" + path;
    res.redirect('/' + path);
  }catch(error){
    return next(new Error('error adding folder. '+error.message));
  }  
}

module.exports.login = (req,res,next)=>{

  //create a random state value
  let state = crypto.randomBytes(16).toString('hex');

  //Save state and temporarysession for 10 mins
  // mycache.set(state, "aTempSessionValue", 600);

  mycache.set(state, req.sessionID, 600);

  let dbxRedirect= config.DBX_OAUTH_DOMAIN 
  + config.DBX_OAUTH_PATH 
  + "?response_type=code&client_id="+config.DBX_APP_KEY
  + "&redirect_uri="+config.OAUTH_REDIRECT_URL 
  + "&state="+state;
  
  res.redirect(dbxRedirect);
}


//steps 8-12
module.exports.oauthredirect = async (req,res,next)=>{

	if(req.query.error_description){
		return next( new Error(req.query.error_description));
	} 

	let state= req.query.state;


	//if(!mycache.get(state)){
	if(mycache.get(state)!=req.sessionID){
		return next(new Error("session expired or invalid state"));
	} 

  //Exchange code for token
  if(req.query.code ){

  	let options={
  		url: config.DBX_API_DOMAIN + config.DBX_TOKEN_PATH, 
      //build query string
      qs: {'code': req.query.code, 
      'grant_type': 'authorization_code', 
      'client_id': config.DBX_APP_KEY, 
      'client_secret':config.DBX_APP_SECRET,
      'redirect_uri':config.OAUTH_REDIRECT_URL}, 
      method: 'POST',
      json: true 
    }

    try{

    	let response = await rp(options);

      //we will replace later cache with a proper storage
			//mycache.set("aTempTokenKey", response.access_token, 3600);
			await regenerateSessionAsync(req);
			req.session.token = response.access_token;

      res.redirect("/");

    }catch(error){
    	return next(new Error('error getting token. '+error.message));
    }        
  }
}


//Returns a promise that fulfills when a new session is created
function regenerateSessionAsync(req){
  return new Promise((resolve,reject)=>{
    req.session.regenerate((err)=>{
      err ? reject(err) : resolve();
    });
  });
}



module.exports.logout = async (req,res,next)=>{
  try{

    await destroySessionAsync(req);
    res.redirect("/login");

  }catch(error){
    return next(new Error('error logging out. '+error.message));
  }  
}

//Returns a promise that fulfills when a session is destroyed
function destroySessionAsync(req){
  return new Promise(async (resolve,reject)=>{

    try{

    //First ensure token gets revoked in Dropbox.com
      let options={
        url: config.DBX_API_DOMAIN + config.DBX_TOKEN_REVOKE_PATH, 
        headers:{"Authorization":"Bearer "+req.session.token},
        method: 'POST'
      }
      let result = await rp(options);

    }catch(error){
      reject(new Error('error destroying token. '));
    }  

    //then destroy the session
    req.session.destroy((err)=>{
      err ? reject(err) : resolve();
    });
  });
}



/*Gets temporary links for a set of files in the root folder of the app
It is a two step process:
1.  Get a list of all the paths of files in the folder
2.  Fetch a temporary link for each file in the folder */
async function getLinksAsync(token, path){

  //List images from the root of the app folder
  let result= await listImagePathsAsync(token,path);

  //Get a temporary link for each of those paths returned
  let temporaryLinkResults= await getTemporaryLinksForPathsAsync(token,result.paths);

  //Construct a new array only with the link field
  var temporaryLinks = temporaryLinkResults.map(function (entry) {
    return entry.link;
  });

  return temporaryLinks;
}

async function getFolderLinksAsync(token, path){

  //List images from the root of the app folder
  let result= await listFolderPathsAsync(token, path);
  return result;
}

/*
Returns an object containing an array with the path_lower of each 
image file and if more files a cursor to continue */
async function listImagePathsAsync(token,path){

  let options={
    url: config.DBX_API_DOMAIN + config.DBX_LIST_FOLDER_PATH, 
    headers:{"Authorization":"Bearer "+token},
    method: 'POST',
    json: true ,
    body: {"path":path}
  }
  try{
    //Make request to Dropbox to get list of files
    let result = await rp(options);

    //Filter response to images only
    let entriesFiltered= result.entries.filter(function(entry){
      return entry.path_lower.search(/\.(gif|jpg|jpeg|tiff|png)$/i) > -1;
    }); 

    //Get an array from the entries with only the path_lower fields
    var paths = entriesFiltered.map(function (entry) {
      return entry.path_lower;
    });

    //return a cursor only if there are more files in the current folder
    let response= {};
    response.paths= paths;
    if(result.hasmore) response.cursor= result.cursor;        
    return response;

  }catch(error){
    return next(new Error('error listing folder. '+error.message));
  }        
} 

async function listFolderPathsAsync(token,path){

  let options={
    url: config.DBX_API_DOMAIN + config.DBX_LIST_FOLDER_PATH, 
    headers:{"Authorization":"Bearer "+token},
    method: 'POST',
    json: true ,
    body: {"path":path}
  }

  try{
    //Make request to Dropbox to get list of files
    let result = await rp(options);
var arrayLength = result.entries.length;
var paths = []
for (var i = 0; i < arrayLength; i++) {
    if(result.entries[i][".tag"] === "folder"){
      paths.push(result.entries[i]["path_display"])

    }
    
    //Do something
}
    //Filter response to images only
    //let entriesFiltered= result.entries.filter(function(entry){
      //return entry[".tag"].include("folder") == true;
    //}); 
    
    //Get an array from the entries with only the path_lower fields


    //return a cursor only if there are more files in the current folder
    let response= {};
    response.paths= paths;
    if(result.hasmore) response.cursor= result.cursor;        
    return response;

  }catch(error){
    return next(new Error('error listing folder. '+error.message));
  }        
}

//Returns an array with temporary links from an array with file paths
function getTemporaryLinksForPathsAsync(token,paths){

  var promises = [];
  let options={
    url: config.DBX_API_DOMAIN + config.DBX_GET_TEMPORARY_LINK_PATH, 
    headers:{"Authorization":"Bearer "+token},
    method: 'POST',
    json: true
  }

  //Create a promise for each path and push it to an array of promises
  paths.forEach((path_lower)=>{
    options.body = {"path":path_lower};
    promises.push(rp(options));
  });

  //returns a promise that fullfills once all the promises in the array complete or one fails
  return Promise.all(promises);
}