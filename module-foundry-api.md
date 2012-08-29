Run a build
----
This will run npm against a given archive.

* **URL**

  /build

* **Method:**

  `POST`
  
*  **URL Params**

   **Optional:**
 
   `version=[semver]`
   
   `arch=[cpu]`
   
   `platform=[os]`

* **Data Params**

Should send a application/tar+gzip (.tgz) file directly as data, not as a multipart upload.
This archive should include a package/ prefix for all the source like `npm pack` does.

* **Success Response:**

  * **Code:** 200 <br />
    **Content:**
    
    ```
    	{ event: 'npm:spawn', env: {} }
    	{ event: 'npm:stdout', data: 'npm successful' }
    ```
 
* **Error Response:**


  * **Code:** 401 UNAUTHORIZED <br />
    **Content:** `{ error : "Log in" }`

  OR

  * **Code:** 422 UNPROCESSABLE ENTRY <br />
    **Content:** `{ error : "Unable to unzip archive" }`

  OR

  * **Code:** 500 SERVER ERROR <br />
    **Content:** `{ error : "ECONNREFUSED" }`


* **Sample Call:**

  ```
  curl --data-binary @to-build.tgz module-foundry/build -o built.tgz
  ```  

* **Notes:**
