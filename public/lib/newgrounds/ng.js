window.addEventListener("DOMContentLoaded", () => {
    console.log("Content loaded.");
    const { config } = globalData;
    const { key, secret } = config.newgrounds;
    if (!key || !secret) {
        console.warn("No newgrounds key or secret configured.");
        return;
    }
    const ngio = new Newgrounds.io.core(key, secret);


    function onLoggedIn() {
        console.log("Welcome " + ngio.user.name + "!", ngio.user.icons.large);
        // const button = document.body.appendChild(document.createElement('button'));
        // button.classList.add('button');
        // button.innerText = "lock medals";
        // button.addEventListener('click', e => {
        //  fetchMedals(ngio, medals => {
        //      medals.forEach(medal => medal.unlocked = false);
        //      console.log(medals);
        //  })
        // });
        // Game.onTrigger(action => {
        //  unlockMedal(ngio, action.medal, medal => console.log(medal.name, 'unlocked'));
        // });
        fetchMedals(ngio, () => {});
    }

    function onLoginFailed() {
        console.log("There was a problem logging in: " . ngio.login_error.message );
    }

    function onLoginCancelled() {
        console.log("The user cancelled the login.");
    }

    /*
     * Before we do anything, we need to get a valid Passport session.  If the player
     * has previously logged in and selected 'remember me', we may have a valid session
     * already saved locally.
     */
    function initSession() {
        ngio.getValidSession(function() {
            if (ngio.user) {
                onLoggedIn();
            } else {
                 const button = document.body.appendChild(document.createElement('button'));
                 button.style.position = "absolute";
                 button.style.top = "5px";
                 button.style.left = "5px";
                 button.style.zIndex = 1000;
                 button.classList.add('button');
                 button.innerText = "login newgrounds";
                 button.addEventListener('click', e => {
                    requestLogin();
                 });
                 button.style.display = "none";
            }

        });
    }

    /* 
     * Call this when the user clicks a 'sign in' button from your game.  It MUST be called from
     * a mouse-click event or pop-up blockers will prevent the Newgrounds Passport page from loading.
     */
    function requestLogin() {
        ngio.requestLogin(onLoggedIn, onLoginFailed, onLoginCancelled);
        /* you should also draw a 'cancel login' buton here */
    }

    /*
     * Call this when the user clicks a 'cancel login' button from your game.
     */
    function cancelLogin() {
        /*
         * This cancels the login request made in the previous function. 
         * This will also trigger your onLoginCancelled callback.
         */
        ngio.cancelLoginRequest();
    }

    /*
     * If your user is logged in, you should also draw a 'sign out' button for them
     * and have it call this.
     */
    function logOut() {
        ngio.logOut(function() {
            /*
             * Because we have to log the player out on the server, you will want
             * to handle any post-logout stuff in this function, wich fires after
             * the server has responded.
             */
        });
    }

    initSession();

    let medals = null;
    let medalCallbacks = null;
    function fetchMedals(ngio, callback) {
        if(medals) {
            callback(medals);
        } else if(medalCallbacks) {
            medalCallbacks.push(callback);
        } else {
            medalCallbacks = [callback];
            ngio.callComponent('Medal.getList', {}, result => {
                if(result.success) {
                    medals = result.medals;
                    medals.forEach(medal => console.log(medal.name, medal.unlocked));
                    medalCallbacks.forEach(callback => {
                        callback(medals);
                    });
                    medalCallbacks = null;
                }
            });
        }
    } 

    function unlockMedal(ngio, medal_name, callback) {
        console.log("unlocking", medal_name, "for", ngio.user);
        /* If there is no user attached to our ngio object, it means the user isn't logged in and we can't unlock anything */
        if (!ngio.user) return;
        fetchMedals(ngio, medals => {
            medal = medals.filter(medal => medal.name === medal_name)[0];
            if(medal) {
                if(!medal.unlocked) {
                    ngio.callComponent('Medal.unlock', {id:medal.id}, result => {
                        if(callback)
                            callback(result.medal, true);
                    });
                } else {
                    if(callback)
                        callback(medal, false);
                }
            } else {
                console.warn(`Medal doesn't exist: ${medal_name}`);
            }
        });
    }

    function getMedal(medal_name) {
        unlockMedal(ngio, medal_name, (medal, unlocked) => {
            if (unlocked) {
                console.log("Unlock:" + medal.name);
                const audio = new Audio('lib/newgrounds/sound.mp3');
                audio.play();
            }
        });
    }
    window.getMedal = getMedal;
});
