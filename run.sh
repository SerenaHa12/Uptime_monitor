echo "$PWD/.env"
sudo docker-compose --env-file $PWD/.env -f $PWD/docker-compose.yml up

