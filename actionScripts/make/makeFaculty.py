import json
import requests
import sys, getopt


def main(argv):
    id = -1
    dept = ''
    firstName = '' 
    lastName = ''
    balance = 0
    try:
        opts, args = getopt.getopt(argv,"hi:f:l:b:d:", ["id=", "firstName=", "lastName=", "balance=",  "dept="])
    except getopt.GetoptError as e:
        print ('getFaculty.py -i <id> -f <firstName> -l <lastName> -b <balance>  -d <dept>')
        print(e)
        sys.exit(2)
    if len(sys.argv) == 1:
        print ('getFaculty.py -i <id> -f <firstName> -l <lastName> -b <balance> -d <dept>')
        sys.exit()
    for opt, arg in opts:
        if opt == '-h':
            print ('getFaculty.py -i <id> -f <firstName> -l <lastName> -b <balance>  -d <dept>')
            sys.exit()
        elif opt in ("-i", "--id"):
            id = arg
        elif opt in ("-f", "--firstName"):
            firstName = arg
        elif opt in ("-l", "--lastName"):
            lastName = arg
        elif opt in ("-b", "--balance"):
            balance = arg
        elif opt in ("-d", "--dept"):
            dept = arg

    
    url = 'http://localhost:3000/api/org.hawkoin.network.Faculty'
    

    json_payload = {
            '$class': 'org.hawkoin.network.Faculty',  
            'id': id,        
            'balance': balance,
            'isActive': True,
            'lowBalThreshold': 5,
            'txnThreshold': 75, 
            'accessLevel': 'FACULTY',
            'dept': dept,                
            'contactInfo': {                           
              '$class': 'org.hawkoin.network.ContactInfo',      
              'firstName': firstName,                      
              'lastName': lastName, 
              'email': '',  
              'address': '',
              'city': '',   
              'state': '',  
              'zip': ''                                       
            }                                                   
            }

    try:
        response = requests.post(url, json=json_payload)

        status = response.status_code
       
        if(status != 200):
            json_string = response.text
            parsed_json = json.loads(json_string)
            print(parsed_json['error']['message'])
        elif (status == 200):
            print('Successfully added Faculty', id)

    except requests.exceptions.Timeout:
        # Maybe set up for a retry, or continue in a retry loop
        print("***Error***: Timeout")
    except requests.exceptions.TooManyRedirects:
        # Tell the user their URL was bad and try a different one
        print("***Error***: URL is bad")
    except requests.exceptions.RequestException as e:
        # catastrophic error. bail.
        print (e)
        sys.exit(1)
    except:
        print("*** ERROR *** Unable to post user")


if __name__ == '__main__':
    main(sys.argv[1:])
