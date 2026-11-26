const iconPaths={
home:'<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10M9.5 19.5v-6h5v6"/>',
compass:'<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z"/>',
message:'<path d="M20 15a3 3 0 0 1-3 3H9l-5 3v-3.5A3 3 0 0 1 3 15V7a3 3 0 0 1 3-3h11a3 3 0 0 1 3 3v8Z"/><path d="M8 9h8M8 12h5"/>',
bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
plus:'<path d="M12 5v14M5 12h14"/>',
dots:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
image:'<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="8.5" cy="9" r="1.5"/><path d="m21 15-5-5L5 20"/>',
video:'<rect x="3" y="5" width="13" height="14" rx="3"/><path d="m16 10 5-3v10l-5-3"/>',
smile:'<circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>',
arrow:'<path d="m9 18 6-6-6-6"/>',
heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6a5.5 5.5 0 0 0 1-8.8Z"/>',
comment:'<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z"/>',
share:'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4"/>',
expand:'<path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M3 16v3a2 2 0 0 0 2 2h3M21 16v3a2 2 0 0 1-2 2h-3"/><path d="m8 8-5-5m13 5 5-5M8 16l-5 5m13-5 5 5"/>',
repeat:'<path d="m17 2 4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
bookmark:'<path d="M6 3h12v18l-6-4-6 4V3Z"/>'
};
function renderIcons(root=document){
 root.querySelectorAll("[data-icon]").forEach(el=>{
  if(el.querySelector("svg")) return;
  const name=el.dataset.icon;
  el.insertAdjacentHTML("afterbegin",`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name]||""}</svg>`);
 });
}

function escapeHTML(value){
return String(value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]));
}

function filterPostsByMedia(posts,filter){
if(filter==="text")return posts.filter(post=>!post.image_url);
if(filter==="image")return posts.filter(post=>post.image_url&&(post.media_type||"image")==="image");
if(filter==="video")return posts.filter(post=>post.image_url&&post.media_type==="video");
return posts;
}

function postTemplate(post){
const avatar=post.avatar?`<img src="${escapeHTML(post.avatar)}" alt="">`:'<span class="avatar-placeholder">?</span>';
const repostLabel=post.reposted_at?'<p class="profile-repost-label">Tekrar gönderdi</p>':"";
const createdAt=new Date(post.created_at);
const postTime=post.time||(Number.isNaN(createdAt.getTime())?"Şimdi":createdAt.toLocaleDateString("tr-TR",{day:"numeric",month:"short"}));
const username=post.username||(post.handle||"").replace(/^@/,"");
const media=post.image_url
?`<div class="post-media-frame">${post.media_type==="video"
?`<video class="post-video" src="${escapeHTML(post.image_url)}" controls preload="metadata" playsinline></video>`
:`<button class="post-image-button" type="button" aria-label="Görseli büyüt"><img class="post-image" src="${escapeHTML(post.image_url)}" alt="Gönderi görseli"></button>`}<button class="media-expand-button" type="button" aria-label="Medyayı büyüt"><span data-icon="expand"></span></button></div>`
:"";
return `${repostLabel}<article class="post" data-post-id="${escapeHTML(post.id||"")}" data-post-username="${escapeHTML(username)}">
<header class="post-header">${avatar}<div class="post-author"><strong>${escapeHTML(post.author)}</strong><span class="post-meta">${escapeHTML(post.handle)} · ${escapeHTML(postTime)}</span></div><button class="post-menu" type="button" aria-label="Gönderi seçenekleri" data-icon="dots"></button></header>
${post.text?`<p class="post-text">${escapeHTML(post.text)}</p>`:""}${media}
<div class="post-actions">
<button class="like-btn${post.is_liked?" liked":""}" type="button" aria-label="${post.is_liked?"Beğeniyi kaldır":"Beğen"}"><span data-icon="heart"></span><span class="action-label">${post.is_liked?"Beğenildi":"Beğen"}</span><span class="like-count">${post.likes||0}</span></button>
<button class="comment-btn" type="button" aria-label="Yorumları göster"><span data-icon="comment"></span><span class="action-label">Yorum</span><span class="comment-count">${post.comments||0}</span></button>
<button class="repost-btn${post.is_reposted?" reposted":""}" type="button" aria-label="${post.is_reposted?"Yeniden paylaşımı kaldır":"Yeniden paylaş"}"><span data-icon="repeat"></span><span class="action-label">${post.is_reposted?"Paylaşıldı":"Yeniden paylaş"}</span><span class="repost-count">${post.reposts||0}</span></button>
<button class="share-btn" type="button" aria-label="Gönderi bağlantısını paylaş"><span data-icon="share"></span><span class="action-label">Paylaş</span></button>
<button class="save-btn${post.is_saved?" saved":""}" type="button" aria-label="${post.is_saved?"Kaydedildi":"Kaydet"}"><span data-icon="bookmark"></span><span class="action-label">${post.is_saved?"Kaydedildi":"Kaydet"}</span></button>
</div>
<p class="post-action-status" role="status" aria-live="polite" hidden></p>
<section class="post-comments" hidden><div class="comment-list"><p class="comment-placeholder">Yorumlar yükleniyor...</p></div><form class="comment-form"><input class="comment-input" name="text" maxlength="500" placeholder="Bir yorum yaz..." aria-label="Yorum yaz" required><button class="comment-submit" type="submit">Yorumla</button></form><p class="comment-feedback" role="status" aria-live="polite"></p></section></article>`;
}
renderIcons();

function setPostFeedback(article,message){
const status=article.querySelector(".post-action-status");
status.textContent=message;
status.hidden=!message;
}

function renderComment(comment){
const avatar=comment.avatar
?`<img src="${escapeHTML(comment.avatar)}" alt="">`
:`<span class="comment-avatar-placeholder">${escapeHTML((comment.author||"?").trim().slice(0,1).toUpperCase()||"?")}</span>`;
const createdAt=new Date(comment.created_at);
const time=Number.isNaN(createdAt.getTime())?"":createdAt.toLocaleDateString("tr-TR",{day:"numeric",month:"short"});
return `<article class="post-comment">${avatar}<div class="comment-content"><div class="comment-heading"><strong>${escapeHTML(comment.author)}</strong><span>@${escapeHTML(comment.username)}${time?` · ${escapeHTML(time)}`:""}</span></div><p>${escapeHTML(comment.text)}</p></div></article>`;
}

async function loadPostComments(section){
const article=section.closest(".post");
const list=section.querySelector(".comment-list");
list.innerHTML='<p class="comment-placeholder">Yorumlar yükleniyor...</p>';
try{
const response=await fetch(`/api/posts/${article.dataset.postId}/comments`);
const comments=await response.json();
if(!response.ok)throw new Error(comments.error||"Yorumlar yüklenemedi.");
list.innerHTML=comments.length
?comments.map(renderComment).join("")
:'<p class="comment-placeholder">Henüz yorum yok.</p>';
section.dataset.loaded="true";
}catch(error){
list.innerHTML='<p class="comment-placeholder">Yorumlar yüklenemedi. Kapatıp tekrar açabilirsin.</p>';
console.error(error);
}
}

const mediaViewer=document.getElementById("mediaViewer");
const mediaViewerImage=mediaViewer.querySelector(".media-viewer-image");
const mediaViewerVideo=mediaViewer.querySelector(".media-viewer-video");
const mediaViewerClose=document.getElementById("mediaViewerClose");
let mediaViewerTrigger=null;

function openMediaViewer(media,trigger){
mediaViewerTrigger=trigger;
if(media.matches(".post-video")){
media.pause();
mediaViewerImage.hidden=true;
mediaViewerImage.removeAttribute("src");
mediaViewerVideo.src=media.currentSrc||media.src;
mediaViewerVideo.hidden=false;
mediaViewerVideo.load();
}else{
mediaViewerVideo.pause();
mediaViewerVideo.removeAttribute("src");
mediaViewerVideo.load();
mediaViewerVideo.hidden=true;
mediaViewerImage.src=media.currentSrc||media.src;
mediaViewerImage.alt=media.alt||"Büyütülmüş görsel";
mediaViewerImage.hidden=false;
}
mediaViewer.classList.add("open");
mediaViewer.setAttribute("aria-hidden","false");
document.body.classList.add("media-viewer-open");
mediaViewerClose.focus();
}

function closeMediaViewer(){
if(!mediaViewer.classList.contains("open"))return;
mediaViewerVideo.pause();
mediaViewerVideo.removeAttribute("src");
mediaViewerVideo.load();
mediaViewerImage.removeAttribute("src");
mediaViewer.classList.remove("open");
mediaViewer.setAttribute("aria-hidden","true");
document.body.classList.remove("media-viewer-open");
if(mediaViewerTrigger&&mediaViewerTrigger.isConnected)mediaViewerTrigger.focus();
mediaViewerTrigger=null;
}

mediaViewerClose.addEventListener("click",closeMediaViewer);
mediaViewer.addEventListener("click",event=>{if(event.target===mediaViewer)closeMediaViewer();});
mediaViewer.addEventListener("keydown",event=>{
if(event.key!=="Tab")return;
const focusable=mediaViewerVideo.hidden?[mediaViewerClose]:[mediaViewerClose,mediaViewerVideo];
const first=focusable[0];
const last=focusable[focusable.length-1];
if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
});

function attachPostActions(root=document){
root.querySelectorAll(".like-btn").forEach(button=>{
button.addEventListener("click",async()=>{
const article=button.closest(".post");
try{
const response=await fetch(`/api/posts/${article.dataset.postId}/like`,{method:"POST"});
if(response.status===401){openLogin();return;}
const result=await response.json();
if(!response.ok)throw new Error(result.error||"Beğeni güncellenemedi.");
button.classList.toggle("liked",result.liked);
button.querySelector(".like-count").textContent=result.likes;
button.querySelector(".action-label").textContent=result.liked?"Beğenildi":"Beğen";
button.setAttribute("aria-label",result.liked?"Beğeniyi kaldır":"Beğen");
if(viewedProfile&&!document.getElementById("profileView").hidden)await showProfile(viewedProfile.username,currentProfileTab);
}catch(error){setPostFeedback(article,error.message);console.error(error);}
});
});
root.querySelectorAll(".repost-btn").forEach(button=>{
button.addEventListener("click",async()=>{
const article=button.closest(".post");
try{
const response=await fetch(`/api/posts/${article.dataset.postId}/repost`,{method:"POST"});
if(response.status===401){openLogin();return;}
const result=await response.json();
if(!response.ok)throw new Error(result.error||"Tekrar gönderilemedi.");
button.classList.toggle("reposted",result.reposted);
button.querySelector(".repost-count").textContent=result.reposts;
button.querySelector(".action-label").textContent=result.reposted?"Paylaşıldı":"Yeniden paylaş";
button.setAttribute("aria-label",result.reposted?"Yeniden paylaşımı kaldır":"Yeniden paylaş");
if(viewedProfile&&!document.getElementById("profileView").hidden)await showProfile(viewedProfile.username,currentProfileTab);
}catch(error){setPostFeedback(article,error.message);console.error(error);}
});
});
root.querySelectorAll(".save-btn").forEach(button=>button.addEventListener("click",async()=>{
const article=button.closest(".post");
try{
const response=await fetch(`/api/posts/${article.dataset.postId}/save`,{method:"POST"});
if(response.status===401){openLogin();return;}
const result=await response.json();
if(!response.ok)throw new Error(result.error||"Kaydetme durumu güncellenemedi.");
button.classList.toggle("saved",result.saved);
button.querySelector(".action-label").textContent=result.saved?"Kaydedildi":"Kaydet";
button.setAttribute("aria-label",result.saved?"Kaydedildi":"Kaydet");
setPostFeedback(article,result.saved?"Gönderi kaydedildi.":"Gönderi kaydedilenlerden çıkarıldı.");
}catch(error){setPostFeedback(article,error.message);console.error(error);}
}));
root.querySelectorAll(".comment-btn").forEach(button=>button.addEventListener("click",async()=>{
const article=button.closest(".post");
const section=article.querySelector(".post-comments");
section.hidden=!section.hidden;
button.setAttribute("aria-expanded",String(!section.hidden));
if(!section.hidden&&section.dataset.loaded!=="true")await loadPostComments(section);
if(!section.hidden)section.querySelector(".comment-input").focus();
}));
root.querySelectorAll(".comment-form").forEach(form=>form.addEventListener("submit",async event=>{
event.preventDefault();
const article=form.closest(".post");
const input=form.elements.text;
const submit=form.querySelector(".comment-submit");
const feedback=form.parentElement.querySelector(".comment-feedback");
const text=input.value.trim();
if(!text)return;
submit.disabled=true;
feedback.textContent="";
try{
const response=await fetch(`/api/posts/${article.dataset.postId}/comments`,{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({text})
});
const result=await response.json();
if(response.status===401){openLogin();return;}
if(!response.ok)throw new Error(result.error||"Yorum gönderilemedi.");
const list=form.parentElement.querySelector(".comment-list");
if(!list.querySelector(".post-comment"))list.innerHTML="";
list.insertAdjacentHTML("beforeend",renderComment(result.comment));
article.querySelector(".comment-count").textContent=result.comments;
input.value="";
form.parentElement.dataset.loaded="true";
}catch(error){feedback.textContent=error.message;console.error(error);}
finally{submit.disabled=false;}
}));
root.querySelectorAll(".share-btn").forEach(button=>button.addEventListener("click",async()=>{
const article=button.closest(".post");
const url=new URL(`/@${encodeURIComponent(article.dataset.postUsername)}`,window.location.origin);
url.searchParams.set("post",article.dataset.postId);
try{
if(navigator.share){
await navigator.share({title:"Nexo gönderisi",url:url.href});
setPostFeedback(article,"Paylaşım bağlantısı hazır.");
}else if(navigator.clipboard&&navigator.clipboard.writeText){
await navigator.clipboard.writeText(url.href);
setPostFeedback(article,"Gönderi bağlantısı kopyalandı.");
}else{
window.prompt("Gönderi bağlantısını kopyala:",url.href);
}
}catch(error){
if(error.name!=="AbortError"){
setPostFeedback(article,"Bağlantı paylaşılamadı. Lütfen tekrar dene.");
console.error(error);
}
}
}));
root.querySelectorAll(".post-media-frame").forEach(frame=>{
const imageButton=frame.querySelector(".post-image-button");
const expandButton=frame.querySelector(".media-expand-button");
if(imageButton)imageButton.addEventListener("click",()=>openMediaViewer(imageButton.querySelector(".post-image"),imageButton));
expandButton.addEventListener("click",()=>{
const media=frame.querySelector(".post-video,.post-image");
if(media)openMediaViewer(media,expandButton);
});
});
}
attachPostActions();
const registerForm=document.getElementById("registerForm");
const loginForm=document.getElementById("loginForm");
const registerModal=document.getElementById("registerModal");
const loginModal=document.getElementById("loginModal");
let currentUser=null;
let viewedProfile=null;
let currentProfileTab="posts";
let currentProfileMediaFilter="all";

function setAvatar(imageId,initialsId,url,initials){
const image=document.getElementById(imageId);
const label=document.getElementById(initialsId);
label.textContent=initials||"?";
label.hidden=Boolean(url);
image.hidden=!url;
if(url)image.src=url;
else image.removeAttribute("src");
}

function openRegister(){
loginModal.classList.remove("open");loginModal.setAttribute("aria-hidden","true");
registerModal.classList.add("open");registerModal.setAttribute("aria-hidden","false");
document.getElementById("registerError").textContent="";
setTimeout(()=>registerForm.querySelector("input").focus(),150);
}
function openLogin(){
registerModal.classList.remove("open");registerModal.setAttribute("aria-hidden","true");
loginModal.classList.add("open");loginModal.setAttribute("aria-hidden","false");
document.getElementById("loginError").textContent="";
setTimeout(()=>loginForm.querySelector("input").focus(),150);
}
function closeAuth(){
registerModal.classList.remove("open");registerModal.setAttribute("aria-hidden","true");
loginModal.classList.remove("open");loginModal.setAttribute("aria-hidden","true");
}
document.getElementById("registerClose").addEventListener("click",closeAuth);
document.getElementById("loginClose").addEventListener("click",closeAuth);
registerModal.addEventListener("click",event=>{if(event.target===registerModal)closeAuth();});
loginModal.addEventListener("click",event=>{if(event.target===loginModal)closeAuth();});
document.getElementById("openLoginFromRegister").addEventListener("click",openLogin);
document.getElementById("openRegisterFromLogin").addEventListener("click",openRegister);
document.getElementById("topbarLogin").addEventListener("click",openLogin);
document.getElementById("topbarRegister").addEventListener("click",openRegister);

function updateCurrentUser(user){
currentUser=user.authenticated?user:null;
document.getElementById("sidebarName").textContent=currentUser?currentUser.name:"Misafir";
document.getElementById("sidebarHandle").textContent=currentUser?`@${currentUser.username}`:"Giriş yapılmadı";
const initials=currentUser?currentUser.name.trim().slice(0,2).toUpperCase():"?";
setAvatar("sidebarAvatarImage","sidebarInitials",currentUser&&currentUser.avatar,initials);
setAvatar("storyAvatarImage","storyInitials",currentUser&&currentUser.avatar,initials);
setAvatar("composerAvatarImage","composerInitials",currentUser&&currentUser.avatar,initials);
document.getElementById("guestActions").hidden=Boolean(currentUser);
document.getElementById("topbarLogout").hidden=!currentUser;
}
function setActiveView(view){
document.querySelectorAll(".nav-item, .mobile-nav [data-view]").forEach(item=>{
item.classList.toggle("active",item.dataset.view===view);
});
}
function showHome(){
document.getElementById("homeView").hidden=false;
document.getElementById("exploreView").hidden=true;
document.getElementById("profileView").hidden=true;
setActiveView("home");
window.history.replaceState({}, "", "/");
}
async function showExplore(){
document.getElementById("homeView").hidden=true;
document.getElementById("exploreView").hidden=false;
document.getElementById("profileView").hidden=true;
setActiveView("explore");
window.history.replaceState({}, "", "/explore");
await loadExplorePosts();
}
async function loadCurrentUser(){
try{
const response=await fetch("/api/me");
const user=await response.json();
updateCurrentUser(user);
const match=window.location.pathname.match(/^\/@([a-z0-9_.]+)$/);
if(match)await showProfile(match[1]);
else if(window.location.pathname==="/explore")await showExplore();
}catch(error){console.error(error);}
}
document.getElementById("authMenuButton").addEventListener("click",()=>{
if(currentUser){
if(confirm("Çıkış yapmak istiyor musun?")) fetch("/api/logout",{method:"POST"}).then(()=>loadCurrentUser());
}else openLogin();
});
document.getElementById("topbarLogout").addEventListener("click",async()=>{
await fetch("/api/logout",{method:"POST"});
await loadCurrentUser();
showHome();
});

async function showProfile(username){
if(!username && currentUser)username=currentUser.username;
if(!username){openRegister();return;}
const sharedPostId=new URLSearchParams(window.location.search).get("post");
const sameProfile=Boolean(viewedProfile&&viewedProfile.username===username);
const selectedTab=viewedProfile&&viewedProfile.username===username?currentProfileTab:"posts";
if(!sameProfile)currentProfileMediaFilter="all";
const profileError=document.getElementById("profileError");
profileError.textContent="";
document.getElementById("homeView").hidden=true;
document.getElementById("exploreView").hidden=true;
document.getElementById("profileView").hidden=false;
setActiveView("profile");
try{
const response=await fetch(`/api/users/${encodeURIComponent(username)}`);
if(!response.ok){
const data=await response.json();
throw new Error(data.error||"Profil bulunamadı.");
}
const profile=await response.json();
viewedProfile=profile;
currentProfileTab=selectedTab;
setAvatar("profileAvatarImage","profileInitials",profile.avatar,profile.name.trim().slice(0,2).toUpperCase());
const coverImage=document.getElementById("profileCoverImage");
coverImage.hidden=!profile.cover;
if(profile.cover)coverImage.src=profile.cover;
else coverImage.removeAttribute("src");
document.getElementById("profileName").textContent=profile.name;
document.getElementById("profileHandle").textContent=`@${profile.username}`;
document.getElementById("profileBio").textContent=profile.bio||"Henüz bir biyografi eklenmemiş.";
document.getElementById("profilePostCount").textContent=profile.posts.length;
document.getElementById("profileFollowerCount").textContent=profile.followers;
document.getElementById("profileFollowingCount").textContent=profile.following;
const profileAction=document.getElementById("profileAction");
const isOwnProfile=Boolean(currentUser&&currentUser.username===profile.username);
profileAction.hidden=!isOwnProfile;
profileAction.textContent="Profili düzenle";
renderProfileTab(currentProfileTab);
window.history.replaceState({}, "", `/@${profile.username}${sharedPostId&&/^\d+$/.test(sharedPostId)?`?post=${sharedPostId}`:""}`);
if(sharedPostId&&/^\d+$/.test(sharedPostId)){
const sharedPost=document.querySelector(`.post[data-post-id="${sharedPostId}"]`);
if(sharedPost)setTimeout(()=>sharedPost.scrollIntoView({behavior:"smooth",block:"center"}),0);
}
}catch(error){
profileError.textContent=error.message;
console.error(error);
}
}

function renderProfileTab(tab){
if(!viewedProfile)return;
const tabContent={
posts:{title:"Paylaşımlar",description:"Bu profilde paylaşılan gönderiler",empty:"Henüz paylaşım yok",posts:viewedProfile.posts},
likes:{title:"Beğeniler",description:"Bu profilin beğendiği gönderiler",empty:"Henüz beğenilen gönderi yok",posts:viewedProfile.likes},
reposts:{title:"Tekrar gönderiler",description:"Bu profilin tekrar gönderdiği içerikler",empty:"Henüz tekrar gönderi yok",posts:viewedProfile.reposts}
}[tab];
if(!tabContent)return;
currentProfileTab=tab;
document.querySelectorAll(".profile-tab").forEach(button=>{
const active=button.dataset.profileTab===tab;
button.classList.toggle("active",active);
button.setAttribute("aria-selected",String(active));
});
document.getElementById("profileContentTitle").textContent=tabContent.title;
document.getElementById("profileContentDescription").textContent=tabContent.description;
const mediaFilters=document.getElementById("profileMediaFilters");
mediaFilters.hidden=tab!=="posts";
document.querySelectorAll(".profile-media-tab").forEach(button=>{
const active=button.dataset.profileMedia===currentProfileMediaFilter;
button.classList.toggle("active",active);
button.setAttribute("aria-selected",String(active));
});
const root=document.getElementById("profilePosts");
const posts=tab==="posts"?filterPostsByMedia(tabContent.posts,currentProfileMediaFilter):tabContent.posts;
const mediaEmptyMessages={all:"Henüz paylaşım yok",text:"Henüz metin paylaşımı yok",image:"Henüz görsel paylaşımı yok",video:"Henüz video paylaşımı yok"};
const emptyMessage=tab==="posts"?mediaEmptyMessages[currentProfileMediaFilter]:tabContent.empty;
root.innerHTML=posts.length
?posts.map(postTemplate).join("")
:`<div class="profile-empty"><strong>${emptyMessage}</strong><p>İçerik paylaşıldığında burada görünecek.</p></div>`;
renderIcons(root);
attachPostActions(root);
}

document.querySelectorAll(".profile-tab").forEach(button=>{
button.addEventListener("click",()=>renderProfileTab(button.dataset.profileTab));
});
document.querySelectorAll(".profile-media-tab").forEach(button=>{
button.addEventListener("click",()=>{
currentProfileMediaFilter=button.dataset.profileMedia;
renderProfileTab(currentProfileTab);
});
});

const profileEditModal=document.getElementById("profileEditModal");
const profileEditForm=document.getElementById("profileEditForm");
const profileBioInput=document.getElementById("editProfileBio");
const profileBioCount=document.getElementById("profileBioCount");
const profileUploadFields=[
{input:document.getElementById("editProfileAvatar"),label:document.getElementById("profileAvatarFileName")},
{input:document.getElementById("editProfileCover"),label:document.getElementById("profileCoverFileName")}
];
function updateProfileBioCount(){
profileBioCount.textContent=`${profileBioInput.value.length} / 160`;
}
profileBioInput.addEventListener("input",updateProfileBioCount);
profileUploadFields.forEach(({input,label})=>{
input.addEventListener("change",()=>{
label.textContent=input.files.length?input.files[0].name:"JPG, PNG veya WEBP · 5 MB";
input.closest(".profile-upload-card").classList.toggle("has-file",input.files.length>0);
});
});
function closeProfileEdit(){
profileEditModal.classList.remove("open");
profileEditModal.setAttribute("aria-hidden","true");
}
function openProfileEdit(){
if(!currentUser||!viewedProfile||currentUser.username!==viewedProfile.username)return;
document.getElementById("editProfileName").value=viewedProfile.name;
profileBioInput.value=viewedProfile.bio||"";
updateProfileBioCount();
document.getElementById("profileEditError").textContent="";
profileUploadFields.forEach(({input,label})=>{
input.value="";
label.textContent="JPG, PNG veya WEBP · 5 MB";
input.closest(".profile-upload-card").classList.remove("has-file");
});
profileEditModal.classList.add("open");
profileEditModal.setAttribute("aria-hidden","false");
}
document.getElementById("profileAction").addEventListener("click",openProfileEdit);
document.getElementById("profileEditClose").addEventListener("click",closeProfileEdit);
profileEditModal.addEventListener("click",event=>{if(event.target===profileEditModal)closeProfileEdit();});
profileEditForm.addEventListener("submit",async event=>{
event.preventDefault();
const error=document.getElementById("profileEditError");
const submit=profileEditForm.querySelector(".auth-submit");
error.textContent="";
submit.disabled=true;
try{
const response=await fetch("/api/profile",{method:"POST",body:new FormData(profileEditForm)});
const data=await response.json();
if(!response.ok)throw new Error(data.error||"Profil güncellenemedi.");
updateCurrentUser(data);
closeProfileEdit();
await showProfile(data.username);
}catch(failure){
error.textContent=failure.message;
}finally{
submit.disabled=false;
}
});

registerForm.addEventListener("submit",async event=>{
event.preventDefault();
const form=new FormData(registerForm);
const error=document.getElementById("registerError");
const submit=registerForm.querySelector(".auth-submit");
error.textContent="";
submit.disabled=true;
try{
const response=await fetch("/api/register",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:form.get("name"),username:form.get("username"),password:form.get("password")})});
const data=await response.json();
if(!response.ok)throw new Error(data.error||"Kayıt oluşturulamadı.");
updateCurrentUser(data);registerForm.reset();closeAuth();
await showProfile(data.username);
}catch(failure){error.textContent=failure.message;}
finally{submit.disabled=false;}
});

loginForm.addEventListener("submit",async event=>{
event.preventDefault();
const form=new FormData(loginForm);
const error=document.getElementById("loginError");
const submit=loginForm.querySelector(".auth-submit");
error.textContent="";
submit.disabled=true;
try{
const response=await fetch("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:form.get("username"),password:form.get("password")})});
const data=await response.json();
if(!response.ok)throw new Error(data.error||"Giriş yapılamadı.");
updateCurrentUser(data);loginForm.reset();closeAuth();
await showProfile(data.username);
}catch(failure){error.textContent=failure.message;}
finally{submit.disabled=false;}
});
loadCurrentUser();

document.querySelectorAll(".nav-item").forEach(button=>button.addEventListener("click",()=>{
if(button.dataset.view==="profile"){
showProfile();
}else if(button.dataset.view==="home"){
showHome();
}else if(button.dataset.view==="explore"){
showExplore();
}else{
setActiveView(button.dataset.view);
}
}));

document.querySelector(".mobile-nav [data-view='profile']").addEventListener("click",()=>showProfile());
document.querySelector(".mobile-nav [data-view='explore']").addEventListener("click",showExplore);
document.getElementById("sidebarProfileTrigger").addEventListener("click",()=>showProfile());
document.querySelector(".mobile-nav [data-view='home']").addEventListener("click",showHome);

const modal=document.getElementById("postModal");
const postText=document.getElementById("postText");
const charCount=document.getElementById("charCount");
const publishBtn=document.getElementById("publishBtn");
const postMediaInput=document.getElementById("postMediaInput");
const postMediaButton=document.getElementById("postMediaButton");
const postMediaName=document.getElementById("postMediaName");
const postMediaClear=document.getElementById("postMediaClear");
const allMediaTypes=".jpg,.jpeg,.png,.webp,.mp4,.webm,image/jpeg,image/png,image/webp,video/mp4,video/webm";
function updatePublishButton(){
publishBtn.disabled=!postText.value.trim()&&!postMediaInput.files.length;
}
function clearPostMedia(){
postMediaInput.value="";
postMediaInput.accept=allMediaTypes;
postMediaName.textContent="";
postMediaName.hidden=true;
postMediaClear.hidden=true;
updatePublishButton();
}
postMediaInput.addEventListener("change",()=>{
const file=postMediaInput.files[0];
postMediaName.textContent=file?file.name:"";
postMediaName.hidden=!file;
postMediaClear.hidden=!file;
updatePublishButton();
});
postMediaButton.addEventListener("click",()=>postMediaInput.click());
postMediaClear.addEventListener("click",clearPostMedia);
let tagData={popular:[],new:[]};
let activeTagMode="popular";
function renderTrendingTags(){
document.querySelectorAll(".tag-tab").forEach(button=>{
const active=button.dataset.tagMode===activeTagMode;
button.classList.toggle("active",active);
button.setAttribute("aria-selected",String(active));
});
const tags=document.getElementById("trendingTags");
const items=tagData[activeTagMode];
if(!items.length){
tags.innerHTML='<p class="tag-empty">Gönderilerde kullanılan etiketler burada görünecek.</p>';
return;
}
tags.innerHTML=items.map(item=>`<div class="trend-tag"><span class="trend-tag-hash" aria-hidden="true">#</span><span class="trend-tag-copy"><strong>#${escapeHTML(item.tag)}</strong><small>${item.posts} gönderi</small></span></div>`).join("");
}
async function loadTrendingTags(){
try{
const response=await fetch("/api/tags");
if(!response.ok)throw new Error("Etiketler yüklenemedi.");
tagData=await response.json();
renderTrendingTags();
}catch(error){
console.error(error);
document.getElementById("trendingTags").innerHTML='<p class="tag-empty">Etiketler şu anda yüklenemiyor.</p>';
}
}
document.querySelectorAll(".tag-tab").forEach(button=>{
button.addEventListener("click",()=>{
activeTagMode=button.dataset.tagMode;
renderTrendingTags();
});
});
let explorePostsData=[];
let activeExploreFilter="all";
function renderExplorePosts(){
document.querySelectorAll(".explore-tab").forEach(button=>{
const active=button.dataset.exploreFilter===activeExploreFilter;
button.classList.toggle("active",active);
button.setAttribute("aria-selected",String(active));
});
const posts=filterPostsByMedia(explorePostsData,activeExploreFilter);
const emptyMessages={all:"Henüz keşfedilecek gönderi yok",text:"Henüz metin paylaşımı yok",image:"Henüz görsel paylaşımı yok",video:"Henüz video paylaşımı yok"};
const root=document.getElementById("explorePosts");
root.innerHTML=posts.length
?posts.map(postTemplate).join("")
:`<div class="profile-empty"><strong>${emptyMessages[activeExploreFilter]}</strong><p>Yeni gönderiler burada görünecek.</p></div>`;
renderIcons(root);
attachPostActions(root);
}
async function loadExplorePosts(){
const root=document.getElementById("explorePosts");
root.innerHTML='<div class="profile-empty"><strong>İçerikler yükleniyor...</strong></div>';
try{
const response=await fetch("/api/posts");
if(!response.ok)throw new Error("Keşfet gönderileri yüklenemedi.");
explorePostsData=await response.json();
renderExplorePosts();
}catch(error){
console.error(error);
root.innerHTML='<div class="profile-empty"><strong>İçerikler yüklenemedi</strong><p>Lütfen daha sonra tekrar dene.</p></div>';
}
}
document.querySelectorAll(".explore-tab").forEach(button=>{
button.addEventListener("click",()=>{
activeExploreFilter=button.dataset.exploreFilter;
renderExplorePosts();
});
});
function openModal(mediaType){
if(!currentUser){openRegister();return;}
if(typeof mediaType!=="string")mediaType=null;
postText.value="";
charCount.textContent="0 / 280";
clearPostMedia();
modal.classList.add("open");modal.setAttribute("aria-hidden","false");
if(mediaType){
postMediaInput.accept=mediaType==="image"?".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp":".mp4,.webm,video/mp4,video/webm";
postMediaInput.click();
}else setTimeout(()=>postText.focus(),150);
}
function closeModal(){modal.classList.remove("open");modal.setAttribute("aria-hidden","true");}
["newPostBtn","composerInput","mobileCreate"].forEach(id=>document.getElementById(id).addEventListener("click",openModal));
document.getElementById("composerImageButton").addEventListener("click",()=>openModal("image"));
document.getElementById("composerVideoButton").addEventListener("click",()=>openModal("video"));
document.getElementById("emptyPostBtn").addEventListener("click",openModal);
document.getElementById("modalClose").addEventListener("click",closeModal);
modal.addEventListener("click",event=>{if(event.target===modal)closeModal();});
postText.addEventListener("input",()=>{
charCount.textContent=`${postText.value.length} / 280`;
updatePublishButton();
});
updatePublishButton();
publishBtn.addEventListener("click",async()=>{
const text=postText.value.trim();
const mediaFile=postMediaInput.files[0];
if(!text&&!mediaFile)return;
publishBtn.disabled=true;
try{
const formData=new FormData();
formData.append("text",text);
if(mediaFile)formData.append("media",mediaFile);
const response=await fetch("/api/posts",{method:"POST",body:formData});
if(!response.ok){
const data=await response.json();
if(data.auth_required){closeModal();openLogin();return;}
throw new Error(data.error||"Gönderi kaydedilemedi.");
}
postText.value="";
charCount.textContent="0 / 280";
clearPostMedia();
closeModal();
await loadPosts();
if(!document.getElementById("exploreView").hidden)await loadExplorePosts();
await loadTrendingTags();
if(viewedProfile&&currentUser&&viewedProfile.username===currentUser.username&&!document.getElementById("profileView").hidden){
await showProfile(viewedProfile.username,currentProfileTab);
}
}catch(error){
alert(error.message);
publishBtn.disabled=false;
}
});

async function loadPosts(){
const feed=document.getElementById("feedPosts");
try{
const response=await fetch("/api/posts");
if(!response.ok)return;
const posts=await response.json();
if(posts.length===0)return;
feed.className="";
feed.innerHTML=posts.map(postTemplate).join("");
renderIcons(feed);
attachPostActions(feed);
}catch(error){console.error(error);}
}
loadPosts();
loadTrendingTags();
document.addEventListener("keydown",event=>{
if(event.key==="Escape"){closeModal();closeAuth();closeProfileEdit();closeMediaViewer();}
if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==="k"){event.preventDefault();document.getElementById("searchInput").focus();}
});
