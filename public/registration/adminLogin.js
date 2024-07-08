const email = document.getElementById("email");
const pass = document.getElementById("pass");
const form = document.getElementById("form");


const errEmail =document.getElementById("emailMessage");
const errPass = document .getElementById("passMessage");


form.addEventListener("submit",(e)=>{

let emailCheck = /^([a-z0-9_\-\.])+\@([gmail ||hotmail_\-\.])+\.([com]{2,4})$/

if(!email.value.match(emailCheck)){

e.preventDefault();
errEmail.innerHTML = "valid email is requied";

}

if(pass.value.length <6 && pass.value ==="" ){
    e.preventDefault();
    errPass.innerHTML = "password must be more than 5 charecter"
}
if(pass.value.length>=12){
    e.preventDefault();
    errPass.innerHTML = "password cannot be morethan 15 charater"
}
})
