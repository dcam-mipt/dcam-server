mongo << EOF
    use dev
    db.dropDatabase()
EOF

unzip dump.zip
mongorestore
rm -rf dump.zip
rm -rf dump