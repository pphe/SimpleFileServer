#!/bin/bash

# File not found
curl http://localhost:8000/sample_files/file.txt

# Append "hello" to file1.txt
curl -X PUT -d hello http://localhost:8000/sample_files/file1.txt

# Read from file1.txt
curl http://localhost:8000/sample_files/file1.txt

# File not found
curl -X DELETE http://localhost/8000/sample_files/file1.txt